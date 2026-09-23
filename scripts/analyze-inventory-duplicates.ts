/**
 * scripts/analyze-inventory-duplicates.ts
 *
 * Analisis inventori untuk menemukan:
 * 1. Duplikat SN (serial number yang sama di lebih dari 1 asset)
 * 2. Item duplikat (SKU serupa dengan nama berbeda)
 * 3. Asset yang tidak terhubung ke customer maupun OLT
 * 4. Inventory Items yang tidak punya asset sama sekali (item catalog kosong)
 *
 * Usage: npx tsx scripts/analyze-inventory-duplicates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Analisis Duplikat Inventori ===\n');

  // 1. Cari duplikat SN
  console.log('--- 1. DUPLIKAT SERIAL NUMBER ---');
  const allAssets = await prisma.inventoryAsset.findMany({
    select: {
      id: true,
      serialNumber: true,
      vendor: true,
      model: true,
      status: true,
      currentCustomerId: true,
      itemId: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { serialNumber: 'asc' },
  });

  const snMap = new Map<string, typeof allAssets>();
  for (const a of allAssets) {
    const sn = a.serialNumber?.toUpperCase().trim() || '';
    if (!sn) continue;
    if (!snMap.has(sn)) snMap.set(sn, []);
    snMap.get(sn)!.push(a);
  }

  const duplicateSNs = [...snMap.entries()].filter(([, assets]) => assets.length > 1);

  if (duplicateSNs.length === 0) {
    console.log('  Tidak ada duplikat SN. Bagus!');
  } else {
    console.log(`  Ditemukan ${duplicateSNs.length} SN duplikat:\n`);
    for (const [sn, assets] of duplicateSNs) {
      console.log(`  SN: ${sn} (${assets.length}x)`);
      for (const a of assets) {
        console.log(`    - ID: ${a.id} | Vendor: ${a.vendor || 'N/A'} | Status: ${a.status} | Customer: ${a.currentCustomerId || '-'} | Created: ${a.createdAt.toISOString()}`);
      }
    }
  }

  // 2. Duplikat Item (catalog)
  console.log('\n--- 2. INVENTORY ITEMS SERUPA (KEMUNGKINAN DUPLIKAT) ---');
  const allItems = await prisma.inventoryItem.findMany({
    where: { subCategory: 'ONT' },
    select: {
      id: true,
      sku: true,
      name: true,
      currentStock: true,
      _count: { select: { assets: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`  Total ONT catalog items: ${allItems.length}`);

  // Group by vendor-model pattern
  const vendorModelMap = new Map<string, typeof allItems>();
  for (const item of allItems) {
    // Extract vendor/model from name (e.g. "Modem ZTE F670L GPON" -> "ZTE F670L")
    const key = item.name
      .replace(/^Modem\s+/i, '')
      .replace(/\s+GPON$/i, '')
      .replace(/\s+OEM$/i, ' OEM')
      .trim()
      .toUpperCase();
    if (!vendorModelMap.has(key)) vendorModelMap.set(key, []);
    vendorModelMap.get(key)!.push(item);
  }

  const duplicateItems = [...vendorModelMap.entries()].filter(([, items]) => items.length > 1);

  if (duplicateItems.length === 0) {
    console.log('  Tidak ada item duplikat. Bagus!');
  } else {
    console.log(`  Ditemukan ${duplicateItems.length} kelompok item serupa:\n`);
    for (const [key, items] of duplicateItems) {
      console.log(`  Grup: "${key}"`);
      for (const i of items) {
        console.log(`    - SKU: ${i.sku} | Nama: ${i.name} | Stock: ${i.currentStock} | Assets: ${i._count.assets}`);
      }
    }
  }

  // 3. Items tanpa asset
  console.log('\n--- 3. INVENTORY ITEMS TANPA ASSET (CATALOG KOSONG) ---');
  const emptyItems = allItems.filter((i) => i._count.assets === 0);
  if (emptyItems.length === 0) {
    console.log('  Semua item memiliki asset. Bagus!');
  } else {
    console.log(`  ${emptyItems.length} item ONT tanpa asset:\n`);
    for (const i of emptyItems) {
      console.log(`  - SKU: ${i.sku} | Nama: ${i.name} | Stock: ${i.currentStock}`);
    }
    console.log('\n  Rekomendasi: Hapus item-item ini atau merge ke item yang tepat.');
  }

  // 4. Asset tanpa customer dan tanpa OLT linkage
  console.log('\n--- 4. ASSET AVAILABLE (STOK GUDANG) ---');
  const availableAssets = await prisma.inventoryAsset.findMany({
    where: { assetType: 'MODEM', status: 'AVAILABLE' },
    include: { item: { select: { sku: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`  Total AVAILABLE (stok gudang): ${availableAssets.length}`);

  const byVendor = new Map<string, number>();
  for (const a of availableAssets) {
    const v = a.vendor || 'Generic';
    byVendor.set(v, (byVendor.get(v) || 0) + 1);
  }
  for (const [v, cnt] of [...byVendor.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${v}: ${cnt} unit`);
  }

  // 5. Total summary
  console.log('\n--- 5. RINGKASAN TOTAL INVENTORI ---');
  const allStatus = await prisma.inventoryAsset.groupBy({
    by: ['status'],
    _count: { id: true },
    where: { assetType: 'MODEM' },
  });

  for (const row of allStatus) {
    console.log(`  ${row.status}: ${row._count.id} unit`);
  }

  const inUse = allStatus.find((r) => r.status === 'IN_USE')?._count.id || 0;
  const available = allStatus.find((r) => r.status === 'AVAILABLE')?._count.id || 0;
  const usedGood = allStatus.find((r) => r.status === 'USED_GOOD')?._count.id || 0;
  const defective = allStatus.find((r) => r.status === 'DEFECTIVE')?._count.id || 0;
  const total = inUse + available + usedGood + defective;
  console.log(`  ---------`);
  console.log(`  TOTAL: ${total} unit ONT`);

  // 6. ONU di OLT yang tidak ada di inventori
  console.log('\n--- 6. ONU DI OLT YANG BELUM ADA DI INVENTORI ---');
  const onuStatuses = await prisma.oltOnuStatus.findMany({
    select: { serialNumber: true, macAddress: true, olt: { select: { name: true } } },
  });

  const inventorySnSet = new Set(
    (await prisma.inventoryAsset.findMany({
      where: { assetType: 'MODEM' },
      select: { serialNumber: true },
    })).map((a) => a.serialNumber?.toUpperCase().trim()).filter(Boolean)
  );

  const missingFromInventory = onuStatuses.filter((o) => {
    const sn = o.serialNumber?.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (!sn || sn.length < 6) return false;
    return !inventorySnSet.has(sn);
  });

  if (missingFromInventory.length === 0) {
    console.log('  Semua ONU di OLT sudah ada di inventori. Bagus!');
  } else {
    console.log(`  ${missingFromInventory.length} ONU di OLT belum masuk inventori:`);
    for (const o of missingFromInventory.slice(0, 20)) {
      console.log(`    OLT: ${o.olt?.name} | SN: ${o.serialNumber} | MAC: ${o.macAddress || 'N/A'}`);
    }
    if (missingFromInventory.length > 20) {
      console.log(`    ... dan ${missingFromInventory.length - 20} lainnya`);
    }
    console.log('\n  Jalankan: npx tsx scripts/sync-ont-inventory.ts');
  }

  console.log('\n=== Analisis selesai ===');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[FATAL]', err);
  await prisma.$disconnect();
  process.exit(1);
});
