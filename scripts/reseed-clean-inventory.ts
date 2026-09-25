import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING & PERAPIHAN INVENTORI EUGINEBILL ===\n');

  // 1. Master Categories
  const CATEGORIES = [
    { code: 'CNS', name: 'Bahan Habis Pakai (Consumable)', description: 'Isolasi, kabel ties, sleeve protector, paku klem, baterai, patch cord, adapter FO, label modem' },
    { code: 'MKT', name: 'Perlengkapan Pemasaran (Marketing)', description: 'Brosur A5, spanduk, stiker logo ODP, materi promosi' },
    { code: 'TLS', name: 'Peralatan & Tools Kerja (Tools)', description: 'Fusion splicer, fiber cleaver, stripper, OTDR, OPM, VFL laser, tangga teleskopik, obeng, palu' },
    { code: 'PAS', name: 'Perangkat Pasif FTTH (Passive)', description: 'Box ODP, Box ODC, Join Closure, Splitter PLC 1:2 / 1:4 / 1:8 / 1:16' },
    { code: 'HDW', name: 'Perangkat Keras Utama (Hardware)', description: 'MikroTik Routerboard, OLT, Printer Kantor' },
    { code: 'SUP', name: 'Perlengkapan & ATK Kantor (Supplies)', description: 'Kertas HVS A4, pulpen, pensil, stempel, sticky note, isi staples' },
    { code: 'CBL', name: 'Kabel FTTH & Network (Cable)', description: 'Kabel Dropcore 1 Core 50m - 300m, Kabel Precon, Kabel UTP' },
    { code: 'CPE', name: 'Customer Premises Equipment (CPE / Modem)', description: 'Modem ONT ZTE, HSGQ, VSOL, Skyworth, Huawei, FiberHome, Generic' },
  ];

  const catMap = new Map<string, string>(); // code -> id

  console.log('1. Memperbarui Kategori Master Inventori...');
  for (const cat of CATEGORIES) {
    const upserted = await prisma.inventoryCategory.upsert({
      where: { name: cat.name },
      create: { name: cat.name, description: cat.description },
      update: { description: cat.description },
    });
    catMap.set(cat.code, upserted.id);
  }
  console.log(`  ✓ ${catMap.size} kategori aktif.`);

  // 2. Master Item List (Katalog Rapi & SKU Standar)
  const MASTER_ITEMS = [
    // ─── CONSUMABLE (CNS) ───
    { sku: 'CNS-ISOLASI-HITAM', name: 'ISOLASI HITAM', categoryCode: 'CNS', unit: 'pack', packSize: 1, isSerialized: false },
    { sku: 'CNS-KABEL-TIES-30CM', name: 'KABEL TIES 30 CM (LARGE)', categoryCode: 'CNS', unit: 'pack', packSize: 100, isSerialized: false },
    { sku: 'CNS-KABEL-TIES-20CM', name: 'KABEL TIES 20 CM (MEDIUM)', categoryCode: 'CNS', unit: 'pack', packSize: 100, isSerialized: false },
    { sku: 'CNS-KABEL-TIES-10CM', name: 'KABEL TIES 10 CM (SMALL)', categoryCode: 'CNS', unit: 'pack', packSize: 100, isSerialized: false },
    { sku: 'CNS-SLEEVE-FO-BESAR', name: 'SLEEVE PROTECTOR FO BESAR', categoryCode: 'CNS', unit: 'pack', packSize: 50, isSerialized: false },
    { sku: 'CNS-SLEEVE-FO-KECIL', name: 'SLEEVE PROTECTOR FO KECIL', categoryCode: 'CNS', unit: 'pack', packSize: 50, isSerialized: false },
    { sku: 'CNS-PAKU-KLEM', name: 'PAKU KLEM', categoryCode: 'CNS', unit: 'pack', packSize: 50, isSerialized: false },
    { sku: 'CNS-BAT-REMOTE-AAA', name: 'BATERAI REMOTE AAA', categoryCode: 'CNS', unit: 'pasang', packSize: 2, isSerialized: false },
    { sku: 'CNS-PATCHCORD-SC-UPC', name: 'Patch Cord SC-UPC to SC-UPC', categoryCode: 'CNS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'CNS-ADAPTER-BARREL-FO', name: 'ADAPTER / BARREL FO', categoryCode: 'CNS', unit: 'pack', packSize: 50, isSerialized: false },
    { sku: 'CNS-BRAND-LABEL-LARGE', name: 'BRAND LABEL MODEM LARGE', categoryCode: 'CNS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'CNS-BRAND-LABEL-SMALL', name: 'BRAND LABEL MODEM SMALL', categoryCode: 'CNS', unit: 'pcs', packSize: 1, isSerialized: false },

    // ─── MARKETING (MKT) ───
    { sku: 'MKT-BROSUR-A5-150', name: 'BROSUR A5 ART PAPER 150', categoryCode: 'MKT', unit: 'rim', packSize: 500, isSerialized: false },

    // ─── TOOLS (TLS) ───
    { sku: 'TLS-FIBER-CLEAVER', name: 'FIBER CLEAVER', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-OBENG-KEMBANG', name: 'OBENG KEMBANG', categoryCode: 'TLS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'TLS-OBENG-MIN', name: 'OBENG MIN', categoryCode: 'TLS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'TLS-LABEL-PRINTER', name: 'LABEL PRINTER PORTABLE', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-PALU', name: 'PALU', categoryCode: 'TLS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'TLS-DROP-CABLE-STRIPPER', name: 'DROP CABLE STRIPPER', categoryCode: 'TLS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'TLS-FIBER-STRIPPER', name: 'FIBER STRIPPER', categoryCode: 'TLS', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'TLS-FUSION-SPLICER', name: 'FUSION SPLICER', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-OPM', name: 'OPTICAL POWER METER (OPM)', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-OTDR', name: 'OPTICAL TIME DOMAIN REFLECTOMETER (OTDR)', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-HLS', name: 'HANDHELD LIGHT SOURCE (HLS)', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-TANGGA-TELESKOPIK', name: 'TELESCOPIC LADDER', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'TLS-VFL-LASER', name: 'FIBER OPTIC VISUAL FAULT LOCATOR (LASER)', categoryCode: 'TLS', unit: 'unit', packSize: 1, isSerialized: false },

    // ─── PASSIVE (PAS) ───
    { sku: 'PAS-BOX-ODP', name: 'BOX ODP', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-BOX-ODC', name: 'BOX ODC', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-SPLITTER-1-2', name: 'SPLITTER 1:2', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-SPLITTER-1-4', name: 'SPLITTER 1:4', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-SPLITTER-1-8', name: 'SPLITTER 1:8', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-SPLITTER-1-16', name: 'SPLITTER 1:16', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },
    { sku: 'PAS-JOIN-CLOSURE', name: 'JOIN CLOSURE', categoryCode: 'PAS', unit: 'unit', packSize: 1, isSerialized: false },

    // ─── HARDWARE (HDW) ───
    { sku: 'HDW-MIKROTIK-ROUTERBOARD', name: 'MIKROTIK ROUTER BOARD', categoryCode: 'HDW', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'HDW-OLT', name: 'OLT', categoryCode: 'HDW', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'HDW-PRINTER', name: 'PRINTER KANTOR', categoryCode: 'HDW', unit: 'unit', packSize: 1, isSerialized: true },

    // ─── SUPPLIES (SUP) ───
    { sku: 'SUP-KERTAS-HVS-A4', name: 'KERTAS HVS A4', categoryCode: 'SUP', unit: 'pack', packSize: 1, isSerialized: false },
    { sku: 'SUP-PULPEN', name: 'PULPEN', categoryCode: 'SUP', unit: 'pack', packSize: 12, isSerialized: false },
    { sku: 'SUP-PENSIL', name: 'PENSIL', categoryCode: 'SUP', unit: 'pack', packSize: 12, isSerialized: false },
    { sku: 'SUP-STAMP', name: 'STAMP / STEMPEL KANTOR', categoryCode: 'SUP', unit: 'pcs', packSize: 1, isSerialized: false },
    { sku: 'SUP-STICKY-NOTE', name: 'STICKY NOTE', categoryCode: 'SUP', unit: 'pack', packSize: 1, isSerialized: false },
    { sku: 'SUP-PAPER-STAPLES', name: 'PAPER STAPLES', categoryCode: 'SUP', unit: 'box', packSize: 1, isSerialized: false },

    // ─── CABLE (CBL) ───
    { sku: 'CBL-DROPCORE-1C-50M', name: 'KABEL DROPCORE 1 CORE 50M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },
    { sku: 'CBL-DROPCORE-1C-100M', name: 'KABEL DROPCORE 1 CORE 100M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },
    { sku: 'CBL-DROPCORE-1C-150M', name: 'KABEL DROPCORE 1 CORE 150M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },
    { sku: 'CBL-DROPCORE-1C-200M', name: 'KABEL DROPCORE 1 CORE 200M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },
    { sku: 'CBL-DROPCORE-1C-250M', name: 'KABEL DROPCORE 1 CORE 250M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },
    { sku: 'CBL-DROPCORE-1C-300M', name: 'KABEL DROPCORE 1 CORE 300M', categoryCode: 'CBL', unit: 'roll', packSize: 1, isSerialized: true },

    // ─── CPE MODEM (VENDOR MASTER ITEMS) ───
    { sku: 'EMG-CPE-ONT-ZTE-F670L', name: 'Modem ONT ZTE (F609 / F670L)', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-HSGQ-ONT', name: 'Modem ONT HSGQ', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-VSOL-ONT', name: 'Modem ONT VSOL', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-SKYWORTH-OEM', name: 'Modem ONT Skyworth', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-HUAWEI-HG8245H', name: 'Modem ONT Huawei (HG8245H)', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-FIBERHOME-AN5506', name: 'Modem ONT FiberHome (AN5506)', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
    { sku: 'EMG-CPE-ONT-GENERIC-ONT', name: 'Modem ONT Generic', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  ];

  console.log('\n2. Upserting Item Katalog Rapi...');
  const activeSkus = new Set<string>();

  for (const itemDef of MASTER_ITEMS) {
    activeSkus.add(itemDef.sku);
    const categoryId = catMap.get(itemDef.categoryCode) || null;

    await prisma.inventoryItem.upsert({
      where: { sku: itemDef.sku },
      create: {
        sku: itemDef.sku,
        name: itemDef.name,
        categoryCode: itemDef.categoryCode,
        subCategory: itemDef.subCategory || null,
        unit: itemDef.unit,
        packSize: itemDef.packSize,
        isSerialized: itemDef.isSerialized,
        currentStock: 0, // stok awal dimulaikan 0
        minimumStock: 5,
        categoryId,
        isActive: true,
      },
      update: {
        name: itemDef.name,
        categoryCode: itemDef.categoryCode,
        subCategory: itemDef.subCategory || null,
        unit: itemDef.unit,
        packSize: itemDef.packSize,
        isSerialized: itemDef.isSerialized,
        categoryId,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${MASTER_ITEMS.length} master items tersimpan.`);

  // 3. Re-link inventoryAsset (Modem) ke Item Katalog Utama berdasarkan Vendor
  console.log('\n3. Re-linking inventoryAsset (Modem) ke Item Katalog Vendor...');
  const assets = await prisma.inventoryAsset.findMany({
    where: { assetType: 'MODEM' },
    select: { id: true, vendor: true, model: true, serialNumber: true },
  });

  const vendorItemMap = new Map<string, string>();
  const allMasterCpeItems = await prisma.inventoryItem.findMany({ where: { categoryCode: 'CPE' } });
  
  for (const item of allMasterCpeItems) {
    const sku = item.sku.toUpperCase();
    if (sku.includes('ZTE')) vendorItemMap.set('ZTE', item.id);
    else if (sku.includes('HSGQ')) vendorItemMap.set('HSGQ', item.id);
    else if (sku.includes('VSOL')) vendorItemMap.set('VSOL', item.id);
    else if (sku.includes('SKYWORTH') || sku.includes('SKW')) vendorItemMap.set('SKYWORTH', item.id);
    else if (sku.includes('HUAWEI') || sku.includes('HWA')) vendorItemMap.set('HUAWEI', item.id);
    else if (sku.includes('FIBERHOME') || sku.includes('FBH')) vendorItemMap.set('FIBERHOME', item.id);
    else if (sku.includes('GENERIC')) vendorItemMap.set('GENERIC', item.id);
  }

  const genericId = vendorItemMap.get('GENERIC') || allMasterCpeItems[0]?.id;

  let relinkedCount = 0;
  for (const asset of assets) {
    const vUpper = (asset.vendor || '').toUpperCase();
    let targetItemId = genericId;

    if (vUpper.includes('ZTE')) targetItemId = vendorItemMap.get('ZTE') || targetItemId;
    else if (vUpper.includes('HSGQ')) targetItemId = vendorItemMap.get('HSGQ') || targetItemId;
    else if (vUpper.includes('VSOL')) targetItemId = vendorItemMap.get('VSOL') || targetItemId;
    else if (vUpper.includes('SKYWORTH')) targetItemId = vendorItemMap.get('SKYWORTH') || targetItemId;
    else if (vUpper.includes('HUAWEI')) targetItemId = vendorItemMap.get('HUAWEI') || targetItemId;
    else if (vUpper.includes('FIBERHOME')) targetItemId = vendorItemMap.get('FIBERHOME') || targetItemId;

    if (targetItemId) {
      await prisma.inventoryAsset.update({
        where: { id: asset.id },
        data: { itemId: targetItemId },
      });
      relinkedCount++;
    }
  }
  console.log(`  ✓ ${relinkedCount} modem assets terhubung ke master item vendor.`);

  // 4. Bersihkan duplikasi / item usang yang tidak terpakai
  console.log('\n4. Membersihkan item duplikat / tidak terpakai...');
  const unusedItems = await prisma.inventoryItem.findMany({
    where: {
      sku: { notIn: Array.from(activeSkus) },
    },
    include: {
      _count: {
        select: { assets: true, movements: true, workOrderUsages: true },
      },
    },
  });

  let deletedUnused = 0;
  for (const item of unusedItems) {
    if (item._count.assets === 0 && item._count.movements === 0 && item._count.workOrderUsages === 0) {
      await prisma.inventoryItem.delete({ where: { id: item.id } }).catch(() => {});
      deletedUnused++;
    } else {
      // Nonaktifkan jika masih ada histori
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { isActive: false, currentStock: 0 },
      });
    }
  }
  console.log(`  ✓ ${deletedUnused} item duplikat usang dibersihkan/dinonaktifkan.`);

  // 5. Hitung Ulang Current Stock
  console.log('\n5. Menghitung Ulang Current Stock...');
  const allItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    include: { assets: { select: { status: true } } },
  });

  for (const item of allItems) {
    if (item.categoryCode === 'CPE') {
      // Modem stock = count of assets with status AVAILABLE (gudang)
      const warehouseStock = item.assets.filter(a => a.status === 'AVAILABLE').length;
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: warehouseStock },
      });
      console.log(`  [CPE] ${item.sku} (${item.name}): ${item.assets.length} total unit, ${warehouseStock} stok gudang.`);
    } else {
      // Barang non-modem dimulaikan dari 0 (ditambah via mutasi stok)
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: 0 },
      });
      console.log(`  [NON-CPE] ${item.sku} (${item.name}): currentStock diset ke 0 (menunggu mutasi stok).`);
    }
  }

  console.log('\n=== PEMBERSIHAN & PERAPIHAN KATALOG INVENTORI SELESAI ===');
}

main()
  .catch((e) => {
    console.error('Reseed inventory error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
