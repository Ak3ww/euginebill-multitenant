/**
 * scripts/sync-ont-inventory.ts
 *
 * Sync ONT inventory from OLT (oltOnuStatus) to inventoryAsset.
 *
 * Modes:
 *   --dry-run   Preview what would happen, no DB changes
 *   --wipe      Delete ALL existing inventoryAsset records with assetType=MODEM first (clean slate)
 *   (default)   Upsert ONT assets from OLT without wiping (safe incremental sync)
 *
 * Usage:
 *   npx tsx scripts/sync-ont-inventory.ts --dry-run
 *   npx tsx scripts/sync-ont-inventory.ts --wipe
 *   npx tsx scripts/sync-ont-inventory.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');
const isWipe = process.argv.includes('--wipe');

// ==========================
// Vendor Detection
// ==========================
const VENDOR_PREFIXES: Record<string, { vendor: string; model: string }> = {
  // ZTE
  ZTEG: { vendor: 'ZTE', model: 'F670L' },
  ZTED: { vendor: 'ZTE', model: 'F670L' },
  ZTEC: { vendor: 'ZTE', model: 'F609' },
  ZTEF: { vendor: 'ZTE', model: 'F609' },
  // Huawei
  HWTC: { vendor: 'Huawei', model: 'HG8245H' },
  HUAWEI: { vendor: 'Huawei', model: 'HG8245H' },
  // FiberHome
  FHTT: { vendor: 'FiberHome', model: 'AN5506' },
  FHT: { vendor: 'FiberHome', model: 'AN5506' },
  // Skyworth (VSOL/EFiber OEM)
  SCOM: { vendor: 'Skyworth', model: 'EN101' },
  // Realtek
  RLTK: { vendor: 'Realtek', model: 'OEM' },
  // C-Data / Gigalink
  GGL: { vendor: 'Gigalink', model: 'FD511G' },
  CDAT: { vendor: 'C-Data', model: 'FD511GX' },
};

function detectVendorModel(
  sn: string | null | undefined,
  oltVendor?: string | null
): { vendor: string; model: string } {
  if (!sn) return { vendor: 'Generic', model: 'ONT' };

  const upper = sn.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Match by SN prefix
  for (const [prefix, info] of Object.entries(VENDOR_PREFIXES)) {
    if (upper.startsWith(prefix)) return info;
  }

  // Guess from OLT vendor
  if (oltVendor) {
    const v = oltVendor.toLowerCase();
    if (v.includes('zte')) return { vendor: 'ZTE', model: 'ONT' };
    if (v.includes('huawei')) return { vendor: 'Huawei', model: 'ONT' };
    if (v.includes('fiberhome')) return { vendor: 'FiberHome', model: 'ONT' };
    if (v.includes('vsol')) return { vendor: 'VSOL', model: 'ONT' };
  }

  return { vendor: 'Generic', model: 'ONT' };
}

function normalizeSN(sn: string | null | undefined): string | null {
  if (!sn) return null;
  const cleaned = sn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 6) return null;
  return cleaned;
}

// ==========================
// Get or create ONT category
// ==========================
async function getOrCreateOntCategory(): Promise<string> {
  const existing = await prisma.inventoryCategory.findFirst({
    where: { name: 'CPE / ONT' },
  });
  if (existing) return existing.id;

  const created = await prisma.inventoryCategory.create({
    data: { name: 'CPE / ONT', description: 'Customer Premise Equipment — ONT/Modem GPON' },
  });
  return created.id;
}

// ==========================
// Get or create ONT item per vendor
// ==========================
async function getOrCreateOntItem(
  vendor: string,
  model: string,
  categoryId: string
): Promise<string> {
  const safeSku = (s: string) => s.replace(/[^A-Z0-9-]/gi, '').toUpperCase().slice(0, 20);
  const sku = `EMG-CPE-ONT-${safeSku(vendor)}-${safeSku(model)}`;
  const name = `Modem ${vendor} ${model} GPON`;

  const existing = await prisma.inventoryItem.findFirst({ where: { sku } });
  if (existing) return existing.id;

  const created = await prisma.inventoryItem.create({
    data: {
      sku,
      name,
      categoryId,
      categoryCode: 'CPE',
      subCategory: 'ONT',
      unit: 'pcs',
      isSerialized: true,
      currentStock: 0,
      isActive: true,
      description: `Unit ONT ${vendor} ${model} terdeteksi dari OLT`,
    },
  });

  console.log(`  [+] Created inventory item: ${sku} — ${name}`);
  return created.id;
}

// ==========================
// Main Sync Engine
// ==========================
export async function runSyncOntInventory(opts?: { isDryRun?: boolean; isWipe?: boolean }) {
  const isDryRun = opts?.isDryRun ?? process.argv.includes('--dry-run');
  const isWipe = opts?.isWipe ?? process.argv.includes('--wipe');

  console.log('=== Sync ONT Inventory from OLT ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isWipe ? 'WIPE + SYNC' : 'INCREMENTAL SYNC'}`);
  console.log('');

  // 1. Load all ONUs from OLT
  const onus = await prisma.oltOnuStatus.findMany({
    include: {
      olt: { select: { id: true, name: true, vendor: true } },
      customer: { select: { id: true, username: true, name: true } },
    },
    orderBy: [{ oltId: 'asc' }, { port: 'asc' }, { onuId: 'asc' }],
  });

  console.log(`Total ONU di OLT: ${onus.length}`);

  // Filter valid SNs
  const validOnus = onus.filter((o) => normalizeSN(o.serialNumber));
  const invalidOnus = onus.filter((o) => !normalizeSN(o.serialNumber));

  console.log(`ONU dengan SN valid: ${validOnus.length}`);
  console.log(`ONU tanpa SN (skip): ${invalidOnus.length}`);

  if (invalidOnus.length > 0) {
    console.log('\n--- ONU tanpa SN valid (skip):');
    for (const o of invalidOnus.slice(0, 10)) {
      console.log(`  OLT: ${o.olt?.name} | Port: ${o.port}:${o.onuId} | MAC: ${o.macAddress || 'N/A'} | Desc: ${o.description || 'N/A'}`);
    }
    if (invalidOnus.length > 10) console.log(`  ... dan ${invalidOnus.length - 10} lainnya`);
  }

  // 2. Analyze vendor breakdown
  const vendorCount: Record<string, number> = {};
  for (const o of validOnus) {
    const sn = normalizeSN(o.serialNumber)!;
    const { vendor } = detectVendorModel(sn, o.olt?.vendor);
    vendorCount[vendor] = (vendorCount[vendor] || 0) + 1;
  }

  console.log('\n--- Breakdown Vendor ONT:');
  for (const [v, cnt] of Object.entries(vendorCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}: ${cnt} unit`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Tidak ada perubahan database. Jalankan tanpa --dry-run untuk eksekusi.');
    console.log('Untuk wipe + rebuild: npx tsx scripts/sync-ont-inventory.ts --wipe');
    await prisma.$disconnect();
    return;
  }

  // 3. Wipe existing MODEM assets if --wipe
  if (isWipe) {
    console.log('\n[WIPE] Menghapus semua inventoryAsset bertipe MODEM...');
    
    // First unlink from customers
    const unlinkResult = await prisma.inventoryAsset.updateMany({
      where: { assetType: 'MODEM', currentCustomerId: { not: null } },
      data: { currentCustomerId: null },
    });
    console.log(`  Unlinked ${unlinkResult.count} assets dari pelanggan`);

    // Delete all MODEM assets
    const deleteResult = await prisma.inventoryAsset.deleteMany({
      where: { assetType: 'MODEM' },
    });
    console.log(`  Dihapus: ${deleteResult.count} inventory assets`);

    // Also wipe all inventory items with CPE/ONT category
    const itemsToDelete = await prisma.inventoryItem.findMany({
      where: { categoryCode: 'CPE', subCategory: 'ONT' },
      select: { id: true, sku: true },
    });
    for (const item of itemsToDelete) {
      await prisma.inventoryItem.delete({ where: { id: item.id } }).catch(() => {});
    }
    console.log(`  Dihapus: ${itemsToDelete.length} inventory items (ONT catalog)`);
  }

  // 4. Get or create ONT category
  const categoryId = await getOrCreateOntCategory();

  // 5. Sync ONUs to inventory
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const onu of validOnus) {
    const cleanSn = normalizeSN(onu.serialNumber)!;
    const { vendor, model } = detectVendorModel(cleanSn, onu.olt?.vendor);
    const itemId = await getOrCreateOntItem(vendor, model, categoryId);

    const location = `${onu.olt?.name || 'OLT'} Port ${onu.port}:${onu.onuId}`;
    const status = 'IN_USE';
    const condition = 'USED_GOOD';
    const note = onu.customer
      ? `Terpasang di pelanggan: ${onu.customer.username} (${onu.customer.name}) — ${location}`
      : onu.description
      ? `Lapangan/Fasum: "${onu.description}" — ${location}`
      : `Di lapangan (unassigned) — ${location}`;

    try {
      const existing = await prisma.inventoryAsset.findUnique({ where: { serialNumber: cleanSn } });

      if (existing) {
        await prisma.inventoryAsset.update({
          where: { serialNumber: cleanSn },
          data: {
            vendor,
            model,
            macAddress: onu.macAddress || existing.macAddress,
            status,
            currentCustomerId: onu.customer?.id || null,
            location,
            notes: note.slice(0, 190),
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.inventoryAsset.create({
          data: {
            itemId,
            assetType: 'MODEM',
            serialNumber: cleanSn,
            macAddress: onu.macAddress || null,
            vendor,
            model,
            condition,
            status,
            currentCustomerId: onu.customer?.id || null,
            location,
            notes: note.slice(0, 190),
            installedAt: onu.customer ? (onu.lastSeenAt || new Date()) : null,
          },
        });
        created++;
      }
    } catch (err: any) {
      console.error(`  [ERROR] SN=${cleanSn}: ${err.message}`);
      skipped++;
    }
  }

  // 6. Update currentStock on each item
  console.log('\n[UPDATE] Menghitung ulang currentStock di setiap inventory item...');
  const items = await prisma.inventoryItem.findMany({
    where: { categoryCode: 'CPE', subCategory: 'ONT' },
    include: { assets: { select: { status: true } } },
  });

  for (const item of items) {
    const stockCount = item.assets.filter((a) => a.status === 'AVAILABLE').length;
    const totalCount = item.assets.length;
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: stockCount },
    });
    console.log(`  ${item.sku}: ${totalCount} unit total, ${stockCount} available (stok)`);
  }

  console.log('\n=== Selesai ===');
  console.log(`  Created: ${created} assets baru`);
  console.log(`  Updated: ${updated} assets diupdate`);
  console.log(`  Skipped: ${skipped} (error)`);

  return { created, updated, skipped };
}

if (require.main === module) {
  runSyncOntInventory().catch(async (err) => {
    console.error('[FATAL]', err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
