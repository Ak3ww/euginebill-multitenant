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
import { PrismaClient, TenantStatus, AdminRole } from '@prisma/client';
import { masterPrisma, getTenantDbUrl, getTenantPrisma, disconnectTenantPrisma } from '@/server/db/tenant-manager';
import { whatsappTemplates } from '../../../../prisma/seeds/whatsapp-templates';
import { PERMISSIONS, ROLE_TEMPLATES } from '../../../../prisma/seeds/permissions';
import {
  INVENTORY_CATEGORIES,
  STANDARD_MASTER_ITEMS,
  NUMBERING_RULES,
  DOCUMENT_TEMPLATES,
} from '../../../../prisma/seeds/client-clean-seed';

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
    let company = await prismaClient.company.findFirst();
    if (!company) {
      company = await prismaClient.company.create({
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
          fixedBillingDate: 6,
          enableProrate: true,
          shiftBillingDateIfLate: false,
          isolateProfileName: 'isolir',
          radiusPppoeEnabled: false,
          radiusHotspotEnabled: false,
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

    // 2. Seed Isolation Templates (WhatsApp, Email, HTML Page)
    await prismaClient.isolationTemplate.upsert({
      where: { id: 'isolation-wa-default' },
      update: {},
      create: {
        id: 'isolation-wa-default',
        type: 'whatsapp',
        name: 'Default WhatsApp Isolation Notice',
        message: `Halo *{{customerName}}* 👋\n\n⚠️ *AKUN ANDA TELAH DIISOLIR*\n\nAkun internet Anda telah dibatasi karena masa berlangganan telah habis.\n\n📋 *Detail Akun:*\n• ID Pelanggan: {{customerId}}\n• Username: {{username}}\n• Expired: {{expiredDate}}\n\n🔒 *Status Saat Ini:*\n✗ Akses internet dibatasi\n✗ Bandwidth terbatas ({{rateLimit}})\n✓ Bisa login PPPoE\n\n💡 *Cara Mengaktifkan Kembali:*\n1. Lakukan pembayaran tagihan\n2. Logout dan login ulang PPPoE\n3. Akses internet akan aktif otomatis\n\n🔗 *Link Pembayaran:*\n{{paymentLink}}\n\nButuh bantuan?\n📞 {{companyPhone}}\n📧 {{companyEmail}}\n\nTerima kasih,\n*{{companyName}}*`,
        variables: {
          customerName: 'Nama pelanggan',
          username: 'Username PPPoE',
          expiredDate: 'Tanggal expired',
          rateLimit: 'Rate limit (misal: 64k/64k)',
          paymentLink: 'Link untuk pembayaran',
          companyName: 'Nama perusahaan',
          companyPhone: 'No telepon perusahaan',
          companyEmail: 'Email perusahaan',
        },
        isActive: true,
      },
    });

    await prismaClient.isolationTemplate.upsert({
      where: { id: 'isolation-email-default' },
      update: {},
      create: {
        id: 'isolation-email-default',
        type: 'email',
        name: 'Default Email Isolation Notice',
        subject: '⚠️ Akun Anda Telah Diisolir - {{username}}',
        message: `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;"><h2>⚠️ Akun Anda Telah Diisolir</h2></div><div style="background: #ffffff; padding: 25px; border: 1px solid #e5e7eb;"><p>Halo <strong>{{customerName}}</strong>,</p><p>Akun internet Anda telah dibatasi karena masa berlangganan telah habis pada <strong>{{expiredDate}}</strong>.</p><table width="100%" cellpadding="6"><tr><td width="140"><strong>Username</strong></td><td>{{username}}</td></tr><tr><td><strong>Expired</strong></td><td>{{expiredDate}}</td></tr><tr><td><strong>Rate Limit</strong></td><td>{{rateLimit}}</td></tr></table><div style="text-align: center; margin: 25px 0;"><a href="{{paymentLink}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">💳 Bayar Sekarang</a></div><p>WhatsApp: {{companyPhone}}<br>Email: {{companyEmail}}</p></div></div></body></html>`,
        variables: {
          customerName: 'Nama pelanggan',
          username: 'Username PPPoE',
          expiredDate: 'Tanggal expired',
          rateLimit: 'Rate limit',
          paymentLink: 'URL link untuk pembayaran',
          companyName: 'Nama perusahaan',
          companyPhone: 'No telepon perusahaan',
          companyEmail: 'Email perusahaan',
        },
        isActive: true,
      },
    });

    await prismaClient.isolationTemplate.upsert({
      where: { id: 'isolation-html-default' },
      update: {},
      create: {
        id: 'isolation-html-default',
        type: 'html_page',
        name: 'Default HTML Landing Page',
        message: `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Akun Diisolir - {{companyName}}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; } .card { max-width: 540px; width: 100%; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; text-align: center; } h1 { font-size: 24px; color: #ef4444; margin-bottom: 12px; } p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; } .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; } </style></head><body><div class="card"><h1>Layanan Internet Diisolir</h1><p>Masa berlangganan akun <strong>{{username}}</strong> ({{customerName}}) telah berakhir. Silakan lakukan pembayaran tagihan untuk mengaktifkan kembali layanan.</p><a href="{{paymentLink}}" class="btn">Bayar Tagihan Sekarang</a></div></body></html>`,
        variables: {
          username: 'Username PPPoE',
          customerName: 'Nama pelanggan',
          expiredDate: 'Tanggal expired',
          paymentLink: 'URL link pembayaran',
          companyName: 'Nama perusahaan',
        },
        isActive: true,
      },
    });

    // Link default isolation templates to company
    await prismaClient.company.updateMany({
      where: {
        OR: [
          { isolationWhatsappTemplateId: null },
          { isolationEmailTemplateId: null },
          { isolationHtmlTemplateId: null },
        ],
      },
      data: {
        isolationWhatsappTemplateId: 'isolation-wa-default',
        isolationEmailTemplateId: 'isolation-email-default',
        isolationHtmlTemplateId: 'isolation-html-default',
      },
    });

    // 3. Seed Complete WhatsApp Notification Templates (30 templates)
    for (const tpl of whatsappTemplates) {
      await prismaClient.whatsapp_templates.upsert({
        where: { type: tpl.type },
        create: {
          id: tpl.id || randomUUID(),
          type: tpl.type,
          name: tpl.name,
          message: tpl.message,
          isActive: tpl.isActive !== undefined ? tpl.isActive : true,
        },
        update: {
          name: tpl.name,
          message: tpl.message,
          isActive: tpl.isActive !== undefined ? tpl.isActive : true,
        },
      });
    }

    // 4. Seed Permissions & Role Permission Templates
    for (const perm of PERMISSIONS) {
      await prismaClient.permission.upsert({
        where: { key: perm.key },
        create: {
          id: randomUUID(),
          key: perm.key,
          name: perm.name,
          category: perm.category,
          description: perm.description,
          isActive: true,
        },
        update: {
          name: perm.name,
          category: perm.category,
          description: perm.description,
        },
      });
    }

    for (const [role, permissionKeys] of Object.entries(ROLE_TEMPLATES)) {
      await prismaClient.rolePermission.deleteMany({
        where: { role: role as AdminRole },
      });

      for (const key of permissionKeys) {
        const permission = await prismaClient.permission.findUnique({
          where: { key },
        });
        if (permission) {
          await prismaClient.rolePermission.create({
            data: {
              id: randomUUID(),
              role: role as AdminRole,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    // 5. Seed Default Transaction Categories (Income & Expense)
    const transactionCategories = [
      { id: 'cat-income-pppoe', name: 'Pembayaran PPPoE', type: 'INCOME', description: 'Tagihan PPPoE Bulanan' },
      { id: 'cat-income-hotspot', name: 'Pembayaran Hotspot', type: 'INCOME', description: 'Penjualan Voucher Hotspot' },
      { id: 'cat-income-instalasi', name: 'Biaya Pasang Baru', type: 'INCOME', description: 'Biaya Instalasi & Registrasi' },
      { id: 'cat-income-lainnya', name: 'Pendapatan Lain-lain', type: 'INCOME', description: 'Pendapatan dari sumber lain' },
      { id: 'cat-expense-upstream', name: 'Bandwidth & Upstream', type: 'EXPENSE', description: 'Biaya Upstream & Bandwidth' },
      { id: 'cat-expense-gaji', name: 'Gaji Karyawan', type: 'EXPENSE', description: 'Operasional Gaji' },
      { id: 'cat-expense-listrik', name: 'Listrik & Operasional', type: 'EXPENSE', description: 'Biaya Listrik POP' },
      { id: 'cat-expense-hardware', name: 'Hardware & Material', type: 'EXPENSE', description: 'Pembelian Perangkat Jaringan' },
      { id: 'cat-expense-maintenance', name: 'Maintenance & Repair', type: 'EXPENSE', description: 'Biaya perawatan & perbaikan' },
      { id: 'cat-expense-sewa', name: 'Sewa Tempat & Tiang', type: 'EXPENSE', description: 'Biaya sewa kantor & tiang' },
      { id: 'cat-expense-komisi', name: 'Komisi Agen Voucher', type: 'EXPENSE', description: 'Komisi penjualan agen' },
      { id: 'cat-expense-marketing', name: 'Marketing & Promosi', type: 'EXPENSE', description: 'Promosi & brosur' },
      { id: 'cat-expense-lainnya', name: 'Operasional Lainnya', type: 'EXPENSE', description: 'Biaya operasional lainnya' },
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

    // 6. Seed Document Numbering Rules
    for (const rule of NUMBERING_RULES) {
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

    // 7. Seed Inventory Categories & Standard Master Items
    const categoryMap: Record<string, string> = {};
    for (const invCat of INVENTORY_CATEGORIES) {
      const record = await prismaClient.inventoryCategory.upsert({
        where: { name: invCat.name },
        create: {
          name: invCat.name,
          description: invCat.description,
        },
        update: {
          description: invCat.description,
        },
      });
      categoryMap[invCat.code] = record.id;
    }

    for (const item of STANDARD_MASTER_ITEMS) {
      const categoryId = categoryMap[item.categoryCode] || null;
      await prismaClient.inventoryItem.upsert({
        where: { sku: item.sku },
        create: {
          sku: item.sku,
          name: item.name,
          categoryCode: item.categoryCode,
          subCategory: item.subCategory,
          categoryId,
          unit: item.unit,
          isSerialized: item.isSerialized,
          currentStock: 0,
          packSize: (item as any).packSize || null,
          isActive: true,
        },
        update: {
          name: item.name,
          categoryCode: item.categoryCode,
          subCategory: item.subCategory,
          ...(categoryId ? { categoryId } : {}),
        },
      });
    }

    // 8. Seed Document Templates
    for (const tpl of DOCUMENT_TEMPLATES) {
      const existing = await prismaClient.documentTemplate.findFirst({
        where: { category: tpl.category, name: tpl.name },
      });
      if (!existing) {
        await prismaClient.documentTemplate.create({
          data: {
            category: tpl.category,
            name: tpl.name,
            bodyHtml: tpl.bodyHtml,
            fieldsSchema: tpl.fieldsSchema,
            isActive: true,
          },
        });
      }
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
   * Deletes a tenant from master DB, disconnects connection pool, and drops the tenant's isolated database.
   */
  static async deleteTenant(tenantIdOrSlug: string, dropDatabase = true): Promise<{ success: boolean; message: string }> {
    const cleanSlug = tenantIdOrSlug.toLowerCase().trim();
    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantIdOrSlug }, { slug: cleanSlug }],
      },
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantIdOrSlug}' tidak ditemukan.`);
    }

    // 1. Disconnect and purge cached Prisma Client instance
    await disconnectTenantPrisma(tenant.slug);

    // 2. Drop the isolated MySQL database permanently
    const dbName = tenant.databaseName || `euginebill_tenant_${tenant.slug.replace(/[^a-z0-9_]/g, '_')}`;
    if (dropDatabase && dbName) {
      try {
        await masterPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
        console.log(`[Provisioning] Successfully dropped tenant database: ${dbName}`);
      } catch (dropErr: any) {
        console.warn(`[Provisioning] Error dropping database ${dbName}:`, dropErr.message);
      }
    }

    // 3. Delete related records in master database
    try {
      await masterPrisma.saaSImpersonationToken.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await masterPrisma.saaSInvoice.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await masterPrisma.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
    } catch (relErr: any) {
      console.warn(`[Provisioning] Error cleaning tenant relations:`, relErr.message);
    }

    // 4. Delete tenant record
    await masterPrisma.tenant.delete({
      where: { id: tenant.id },
    });

    return {
      success: true,
      message: `Tenant '${tenant.name}' (${tenant.slug}) dan database '${dbName}' berhasil dihapus permanen.`,
    };
  }
}

