/**
 * Fresh Master DB & Wipe Tenant DBs Script — EugineBill Multi-Tenant SaaS
 * 
 * Usage:
 *   npx tsx scripts/fresh-master-db.ts
 * 
 * What it does:
 * 1. Connects to Master MySQL Server
 * 2. Finds and DROPS all existing `euginebill_tenant_*` databases
 * 3. Truncates/resets all Master SaaS tables (Tenant, TenantSubscription, SaaSInvoice, etc.)
 * 4. Seeds default Subscription Plans (Starter, Pro, Enterprise)
 */

import { masterPrisma } from '../src/server/db/tenant-manager';

async function main() {
  console.log('🚀 Starting Multi-Tenant Database Clean & Reset...');

  try {
    // 1. Fetch all tenant databases from master DB
    const tenants = await masterPrisma.tenant.findMany({
      select: { slug: true, databaseName: true },
    });

    console.log(`🔍 Found ${tenants.length} registered tenants in master DB.`);

    // 2. Drop all tenant databases
    for (const t of tenants) {
      const dbName = t.databaseName || `euginebill_tenant_${t.slug.replace(/[^a-z0-9_]/g, '_')}`;
      try {
        console.log(`🗑️ Dropping tenant database: ${dbName}...`);
        await masterPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
      } catch (err: any) {
        console.warn(`⚠️ Warning dropping ${dbName}: ${err.message}`);
      }
    }

    // 3. Clean all master tenant records
    console.log('🧹 Cleaning Master DB tables...');
    await masterPrisma.saaSInvoice.deleteMany({});
    await masterPrisma.tenantSubscription.deleteMany({});
    await masterPrisma.tenant.deleteMany({});
    await masterPrisma.subscriptionPlan.deleteMany({});

    // 4. Seed standard subscription plans
    console.log('📦 Seeding standard Subscription Plans...');
    await masterPrisma.subscriptionPlan.createMany({
      data: [
        {
          name: 'Starter (RT/RW Net)',
          code: 'starter',
          priceMonthly: 99000,
          priceYearly: 950000,
          maxRouters: 1,
          maxUsers: 100,
          maxVouchers: 500,
          features: JSON.stringify([
            '1 Router MikroTik',
            'Maksimal 100 Pelanggan PPPoE',
            '500 Voucher Hotspot / bln',
            'WhatsApp Notifikasi Tagihan',
            'Isolir Otomatis Pelanggan Menunggak',
          ]),
          isPopular: false,
          isActive: true,
        },
        {
          name: 'Pro (ISP Menengah)',
          code: 'pro',
          priceMonthly: 249000,
          priceYearly: 2390000,
          maxRouters: 5,
          maxUsers: 1000,
          maxVouchers: 999999,
          features: JSON.stringify([
            'Hingga 5 Router MikroTik',
            'Maksimal 1.000 Pelanggan PPPoE',
            'Unlimited Voucher Hotspot Kilat',
            'WhatsApp Bot CS & Auto Tagihan',
            'TR-069 ACS Remote Manajemen ONT',
            'Multi-Admin & Hak Akses Tim',
            'Backup Database Otomatis Harian',
          ]),
          isPopular: true,
          isActive: true,
        },
        {
          name: 'Enterprise (WISP Besar)',
          code: 'enterprise',
          priceMonthly: 499000,
          priceYearly: 4790000,
          maxRouters: 999,
          maxUsers: 999999,
          maxVouchers: 999999,
          features: JSON.stringify([
            'Unlimited Router MikroTik',
            'Unlimited Pelanggan PPPoE & Hotspot',
            'Dedicated FreeRADIUS 3 High Speed',
            'Dedicated VPN Server Port Forwarding',
            'TR-069 ACS ONT Full Features',
            'Whitelabel Custom Domain & Custom Logo',
            'Dukungan Prioritas 24/7 VIP',
          ]),
          isPopular: false,
          isActive: true,
        },
      ],
    });

    console.log('✅ Multi-Tenant Database Reset Complete & Fresh!');
  } catch (error: any) {
    console.error('❌ Error resetting databases:', error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();
