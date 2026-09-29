/**
 * Orphaned Tenant Databases Cleanup Script — EugineBill SaaS
 *
 * Scans MySQL server for databases matching `euginebill_tenant_%`
 * and drops any databases that are no longer registered in master `saas_tenants` table.
 *
 * Usage:
 *   npx tsx scripts/cleanup-deleted-tenants.ts
 */

import { masterPrisma } from '../src/server/db/tenant-manager';

async function main() {
  console.log('====================================================');
  console.log('EugineBill SaaS — Orphaned Tenant Databases Cleanup');
  console.log('====================================================\n');

  try {
    // 1. Get all active tenant databases from master DB
    const activeTenants = await masterPrisma.tenant.findMany({
      select: { id: true, slug: true, databaseName: true, name: true },
    });

    const activeDbNames = new Set(
      activeTenants.map((t) => t.databaseName.toLowerCase())
    );

    console.log(`[Master DB] Found ${activeTenants.length} registered tenant(s):`);
    activeTenants.forEach((t) => {
      console.log(`  - ${t.name} (slug: '${t.slug}', db: '${t.databaseName}')`);
    });
    console.log('');

    // 2. Query all existing tenant databases in MySQL server
    const allDatabasesRaw: any[] = await masterPrisma.$queryRawUnsafe(
      "SHOW DATABASES LIKE 'euginebill_tenant_%'"
    );

    const existingTenantDbs: string[] = allDatabasesRaw.map((row) => {
      const keys = Object.keys(row);
      return (row[keys[0]] as string).toLowerCase();
    });

    console.log(`[MySQL Server] Found ${existingTenantDbs.length} tenant database(s) on server:`);
    existingTenantDbs.forEach((db) => {
      console.log(`  - ${db}`);
    });
    console.log('');

    // 3. Detect orphaned databases
    const orphanedDbs = existingTenantDbs.filter((db) => !activeDbNames.has(db));

    if (orphanedDbs.length === 0) {
      console.log('✅ All tenant databases are clean and 100% synchronized with master DB. No orphaned databases found!\n');
      return;
    }

    console.log(`⚠️ Found ${orphanedDbs.length} ORPHANED tenant database(s) from deleted/unregistered tenants:`);
    orphanedDbs.forEach((db) => console.log(`  - ${db}`));
    console.log('\nDropping orphaned tenant databases...');

    let droppedCount = 0;
    for (const orphanDb of orphanedDbs) {
      try {
        await masterPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${orphanDb}\`;`);
        console.log(`  ✅ Dropped database: ${orphanDb}`);
        droppedCount++;
      } catch (err: any) {
        console.error(`  ❌ Failed to drop database ${orphanDb}:`, err.message);
      }
    }

    console.log(`\n🎉 Cleanup completed! Successfully dropped ${droppedCount} orphaned database(s).\n`);
  } catch (err: any) {
    console.error('Fatal error during tenant databases cleanup:', err);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();
