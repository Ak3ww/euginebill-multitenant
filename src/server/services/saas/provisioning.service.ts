/**
 * Tenant Provisioning Service — EugineBill SaaS Platform
 *
 * Handles automated multi-tenant database provisioning, schema pushing,
 * master catalog seeding, and 1-click demo tenant reset.
 *
 * @module server/services/saas/provisioning.service
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaClient, TenantStatus } from '@prisma/client';
import { masterPrisma, getTenantDbUrl, getTenantPrisma, disconnectTenantPrisma } from '@/server/db/tenant-manager';

const execAsync = promisify(exec);

export interface CreateTenantInput {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  planCode?: string;
  password?: string;
  customDomain?: string;
  isDemo?: boolean;
}

export interface TenantProvisionResult {
  success: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string | null;
    status: TenantStatus;
    databaseName: string;
    customDomain: string | null;
    planName: string;
    trialEndsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  };
  credentials: {
    username: string;
    email: string;
    temporaryPassword?: string;
  };
  redirectUrl: string;
  message: string;
}

export class TenantProvisioningService {
  /**
   * Provisions a brand new tenant with an isolated MySQL database and clean baseline data.
   */
  static async createTenant(input: CreateTenantInput): Promise<TenantProvisionResult> {
    const { name, slug, email, phone, planCode = 'starter', password, customDomain, isDemo = false } = input;

    // 1. Sanitize & Validate Inputs
    const cleanSlug = slug.toLowerCase().trim();
    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(cleanSlug)) {
      throw new Error('Subdomain slug tidak valid. Gunakan 3-30 karakter huruf kecil, angka, atau strip.');
    }

    const reserved = ['admin', 'api', 'app', 'billing', 'master', 'root', 'saas', 'www'];
    if (reserved.includes(cleanSlug)) {
      throw new Error(`Subdomain '${cleanSlug}' dicadangkan untuk sistem internal.`);
    }

    // 2. Check Uniqueness in Master Database
    const existingTenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { email: email.toLowerCase().trim() },
          ...(customDomain ? [{ customDomain: customDomain.toLowerCase().trim() }] : []),
        ],
      },
    });

    if (existingTenant) {
      if (existingTenant.slug === cleanSlug) {
        throw new Error(`Subdomain '${cleanSlug}' sudah digunakan oleh penyedia lain.`);
      }
      if (existingTenant.email.toLowerCase() === email.toLowerCase().trim()) {
        throw new Error(`Alamat email '${email}' sudah terdaftar.`);
      }
      if (customDomain && existingTenant.customDomain === customDomain.toLowerCase().trim()) {
        throw new Error(`Custom domain '${customDomain}' sudah terdaftar.`);
      }
    }

    // 3. Resolve Subscription Plan
    let plan = await masterPrisma.subscriptionPlan.findUnique({
      where: { code: planCode.toLowerCase().trim() },
    });

    if (!plan) {
      // Fallback to starter plan or find first active plan
      plan = await masterPrisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
    }

    // 4. Compute Database Name & Expiration
    const sanitizedDbName = `euginebill_tenant_${cleanSlug.replace(/[^a-z0-9_]/g, '_')}`;
    const trialDays = isDemo ? 365 : 7;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const initialStatus: TenantStatus = isDemo ? 'DEMO' : 'TRIAL';

    // 5. Create Tenant Record in Master Database
    const tenant = await masterPrisma.tenant.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        status: initialStatus,
        databaseName: sanitizedDbName,
        customDomain: customDomain?.toLowerCase().trim() || null,
        planId: plan?.id || null,
        trialEndsAt,
        expiresAt: trialEndsAt,
      },
    });

    // 6. Create Tenant Subscription Record
    if (plan) {
      await masterPrisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: isDemo ? 'ACTIVE' : 'TRIAL',
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          paymentGateway: isDemo ? 'demo' : 'trial_7_days',
          autoRenew: true,
        },
      });
    }

    // 7. Execute MySQL DDL to create the tenant database
    try {
      await masterPrisma.$executeRawUnsafe(
        `CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch (dbErr: any) {
      console.error(`[Provisioning] Failed to create database ${sanitizedDbName}:`, dbErr);
      // Clean up master record on critical DDL failure
      await masterPrisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
      throw new Error(`Gagal membuat database tenant MySQL: ${dbErr.message}`);
    }

    // 8. Programmatically Migrate Schema to the new Tenant Database
    const tenantDbUrl = getTenantDbUrl(cleanSlug, sanitizedDbName);
    try {
      await this.pushSchemaToDatabase(tenantDbUrl);
    } catch (migErr: any) {
      console.error(`[Provisioning] Schema push error for ${sanitizedDbName}:`, migErr);
      throw new Error(`Gagal sinkronisasi schema database tenant: ${migErr.message}`);
    }

    // 9. Instantiate Tenant Prisma Client
    const tenantPrisma = getTenantPrisma(cleanSlug, tenantDbUrl);

    // 10. Create Default SuperAdmin User in Tenant Database
    const rawPassword = password || 'admin123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const adminUsername = 'superadmin';

    await tenantPrisma.adminUser.upsert({
      where: { username: adminUsername },
      create: {
        id: randomUUID(),
        username: adminUsername,
        email: email.toLowerCase().trim(),
        password: passwordHash,
        name: `${name.trim()} Administrator`,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      update: {
        password: passwordHash,
        email: email.toLowerCase().trim(),
      },
    });

    // 11. Seed Company Profile & Master Baseline Catalogs
    await this.seedTenantBaseline(tenantPrisma, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      slug: cleanSlug,
    });

    const redirectUrl = `/admin/login?tenant=${encodeURIComponent(cleanSlug)}`;

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        databaseName: tenant.databaseName,
        customDomain: tenant.customDomain,
        planName: plan?.name || 'Starter Plan',
        trialEndsAt: tenant.trialEndsAt,
        expiresAt: tenant.expiresAt,
        createdAt: tenant.createdAt,
      },
      credentials: {
        username: adminUsername,
        email: email.toLowerCase().trim(),
        temporaryPassword: password ? undefined : rawPassword,
      },
      redirectUrl,
      message: `Tenant '${name}' (${cleanSlug}) berhasil dibuat dan database siap digunakan!`,
    };
  }

  /**
   * Pushes the Prisma schema to a target tenant database programmatically.
   */
  private static async pushSchemaToDatabase(dbUrl: string): Promise<void> {
    const projectRoot = process.cwd();
    const schemaPath = path.resolve(projectRoot, 'prisma', 'schema.prisma');
    const prismaBinPath = path.resolve(projectRoot, 'node_modules', 'prisma', 'build', 'index.js');

    const cmd = `node "${prismaBinPath}" db push --schema="${schemaPath}" --skip-generate --accept-data-loss`;

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
    };

    try {
      await execAsync(cmd, { env, cwd: projectRoot });
    } catch (err: any) {
      // If error occurs, try fallback command invocation
      const fallbackCmd = `npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`;
      await execAsync(fallbackCmd, { env, cwd: projectRoot });
    }
  }

  /**
   * Seeds company profile and default operational baseline catalogs in the tenant database.
   */
  private static async seedTenantBaseline(
    prismaClient: PrismaClient,
    info: { name: string; email: string; phone: string | null; slug: string }
  ): Promise<void> {
    // 1. Seed Company
    const existingCompany = await prismaClient.company.findFirst();
    if (!existingCompany) {
      await prismaClient.company.create({
        data: {
          id: randomUUID(),
          name: info.name,
          email: info.email,
          phone: info.phone || '+6281234567890',
          poweredBy: 'EugineBill SaaS',
          baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          timezone: 'Asia/Jakarta',
          invoiceGenerateDays: 7,
          gracePeriodDays: 0,
          isolationEnabled: true,
          isolationIpPool: '192.168.200.0/24',
          isolationRateLimit: '64k/64k',
          isolationAllowDns: true,
          isolationAllowPayment: true,
          isolationNotifyWhatsapp: true,
          isolationNotifyEmail: false,
          bankAccounts: [],
        },
      });
    }

    // 2. Seed Default Transaction Categories
    const transactionCategories = [
      { id: 'cat-income-pppoe', name: 'Pembayaran PPPoE', type: 'INCOME', description: 'Tagihan PPPoE Bulanan' },
      { id: 'cat-income-hotspot', name: 'Pembayaran Hotspot', type: 'INCOME', description: 'Penjualan Voucher Hotspot' },
      { id: 'cat-income-instalasi', name: 'Biaya Pasang Baru', type: 'INCOME', description: 'Biaya Instalasi & Registrasi' },
      { id: 'cat-expense-upstream', name: 'Bandwidth & Upstream', type: 'EXPENSE', description: 'Biaya Upstream & Bandwidth' },
      { id: 'cat-expense-gaji', name: 'Gaji Karyawan', type: 'EXPENSE', description: 'Operasional Gaji' },
      { id: 'cat-expense-listrik', name: 'Listrik & Operasional', type: 'EXPENSE', description: 'Biaya Listrik POP' },
      { id: 'cat-expense-hardware', name: 'Hardware & Material', type: 'EXPENSE', description: 'Pembelian Perangkat Jaringan' },
    ];

    for (const cat of transactionCategories) {
      await prismaClient.transactionCategory.upsert({
        where: { id: cat.id },
        create: {
          id: cat.id,
          name: cat.name,
          type: cat.type as any,
          description: cat.description,
          isActive: true,
        },
        update: {
          name: cat.name,
          description: cat.description,
        },
      });
    }

    // 3. Seed Document Numbering Rules
    const numberingRules = [
      { category: 'MOU', pattern: 'MOU/{DEPT}/{ROMAN_MM}/{YYYY}/{SEQ:3}', resetFrequency: 'yearly' },
      { category: 'FAK', pattern: 'FAK/{DEPT}/{YYYY}{MM}/{SEQ:4}', resetFrequency: 'monthly' },
      { category: 'KWT', pattern: 'KWT/{YYYY}{MM}/{SEQ:4}', resetFrequency: 'monthly' },
      { category: 'SJ', pattern: 'SJ/LOG/{ROMAN_MM}/{YYYY}/{SEQ:4}', resetFrequency: 'yearly' },
      { category: 'BAST', pattern: 'BAST/{DEPT}/{YYYY}/{SEQ:3}', resetFrequency: 'yearly' },
      { category: 'SPK', pattern: 'SPK/{YYYY}/{SEQ:4}', resetFrequency: 'none' },
    ];

    for (const rule of numberingRules) {
      await prismaClient.numberingRule.upsert({
        where: { category: rule.category },
        create: {
          category: rule.category,
          pattern: rule.pattern,
          resetFrequency: rule.resetFrequency as any,
          currentSeq: 0,
        },
        update: {
          pattern: rule.pattern,
          resetFrequency: rule.resetFrequency as any,
        },
      });
    }

    // 4. Seed Inventory Categories
    const invCategories = [
      { name: 'Hardware Utama (HW)', description: 'Router, Switch, OLT, Server' },
      { name: 'Customer Equipment (CPE)', description: 'Modem ONT, STB, Access Point' },
      { name: 'Perangkat Pasif (PAS)', description: 'ODP, ODC, Closure, Splitter' },
      { name: 'Kabel & Dropcore (CAB)', description: 'Kabel Precon, Dropwire, Patchcord' },
      { name: 'Konektor & Aksesoris (CON)', description: 'Fast Connector, Adapter SC, Klem' },
      { name: 'Power & Adaptor (PWR)', description: 'Adaptor 12V, Mini UPS, POE Injector' },
      { name: 'Alat & Perkakas (TLS)', description: 'Fusion Splicer, Cleaver, Stripper, OPM' },
    ];

    for (const invCat of invCategories) {
      await prismaClient.inventoryCategory.upsert({
        where: { name: invCat.name },
        create: {
          name: invCat.name,
          description: invCat.description,
        },
        update: {
          description: invCat.description,
        },
      });
    }
  }

  /**
   * 1-Click Reset Demo Tenant:
   * Wipes all operational and transaction records (routers, users, invoices, vouchers)
   * so the demo tenant is reset back to a clean 0% setup state.
   */
  static async resetDemoTenant(tenantSlug: string): Promise<{ success: boolean; message: string }> {
    const cleanSlug = tenantSlug.toLowerCase().trim();

    // 1. Verify tenant in Master Database
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });

    if (!tenant) {
      throw new Error(`Tenant dengan slug '${cleanSlug}' tidak ditemukan.`);
    }

    const tenantPrisma = getTenantPrisma(cleanSlug);

    // 2. Perform fast, foreign-key safe table wipe on operational tables
    const tablesToTruncate = [
      'ont_remote_sessions',
      'mikrotik_sessions',
      'manual_payments',
      'invoices',
      'voucher_orders',
      'hotspot_vouchers',
      'voucher_batches',
      'hotspot_users',
      'pppoe_users',
      'users',
      'routers',
      'acs_devices',
      'work_orders',
      'tickets',
      'agent_sales',
      'agent_deposits',
      'financial_transactions',
      'inventory_movements',
      'admin_notifications',
      'customer_notifications',
      'agent_notifications',
      'whatsapp_logs',
      'whatsapp_broadcasts',
    ];

    await tenantPrisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    for (const tbl of tablesToTruncate) {
      try {
        await tenantPrisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tbl}\`;`);
      } catch {
        // Fallback to DELETE if TRUNCATE has table lock / foreign key constraints
        try {
          await tenantPrisma.$executeRawUnsafe(`DELETE FROM \`${tbl}\`;`);
        } catch (delErr: any) {
          console.warn(`[ResetDemo] Could not truncate/delete table ${tbl}:`, delErr.message);
        }
      }
    }

    // Reset inventory stock to 0
    try {
      await tenantPrisma.$executeRawUnsafe('UPDATE `inventory_items` SET `currentStock` = 0;');
    } catch {}

    // Reset numbering rule sequences to 0
    try {
      await tenantPrisma.$executeRawUnsafe('UPDATE `numbering_rules` SET `currentSeq` = 0;');
    } catch {}

    await tenantPrisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    return {
      success: true,
      message: `Tenant '${tenant.name}' (${cleanSlug}) berhasil direset ke kondisi bersih (0% setup).`,
    };
  }

  /**
   * Deletes a tenant from master DB and optionally drops the tenant's isolated database.
   */
  static async deleteTenant(tenantIdOrSlug: string, dropDatabase = false): Promise<{ success: boolean; message: string }> {
    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantIdOrSlug }, { slug: tenantIdOrSlug.toLowerCase().trim() }],
      },
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantIdOrSlug}' tidak ditemukan.`);
    }

    // Disconnect cached Prisma Client instance
    await disconnectTenantPrisma(tenant.slug);

    if (dropDatabase && tenant.databaseName) {
      try {
        await masterPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${tenant.databaseName}\`;`);
      } catch (dropErr: any) {
        console.warn(`[Provisioning] Error dropping database ${tenant.databaseName}:`, dropErr.message);
      }
    }

    await masterPrisma.tenant.delete({
      where: { id: tenant.id },
    });

    return {
      success: true,
      message: `Tenant '${tenant.name}' berhasil dihapus.${dropDatabase ? ' Database telah dihapus permanen.' : ''}`,
    };
  }
}
