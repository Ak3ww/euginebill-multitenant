import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

// ─── Numbering Rules ───────────────────────────────────────────────────────────
const DEFAULT_NUMBERING_RULES = [
  {
    category: 'MOU',
    pattern: 'MOU/{DEPT}/{ROMAN_MM}/{YYYY}/{SEQ:3}',
    resetFrequency: 'yearly',
  },
  {
    category: 'FAK',
    pattern: 'FAK/{DEPT}/{YYYY}{MM}/{SEQ:4}',
    resetFrequency: 'monthly',
  },
  {
    category: 'KWT',
    pattern: 'KWT/{YYYY}{MM}/{SEQ:4}',
    resetFrequency: 'monthly',
  },
  {
    category: 'SJ',
    pattern: 'SJ/LOG/{ROMAN_MM}/{YYYY}/{SEQ:4}',
    resetFrequency: 'yearly',
  },
  {
    category: 'BAST',
    pattern: 'BAST/{DEPT}/{YYYY}/{SEQ:3}',
    resetFrequency: 'yearly',
  },
  {
    category: 'SPK',
    pattern: 'SPK/{YYYY}/{SEQ:4}',
    resetFrequency: 'none',
  },
];

// ─── Default Inventory Categories ─────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { code: 'CNS', name: 'Bahan Habis Pakai (Consumable)', description: 'Isolasi, kabel ties, sleeve protector, paku klem, baterai, patch cord, adapter FO, label modem' },
  { code: 'MKT', name: 'Perlengkapan Pemasaran (Marketing)', description: 'Brosur A5, spanduk, stiker logo ODP, materi promosi' },
  { code: 'TLS', name: 'Peralatan & Tools Kerja (Tools)', description: 'Fusion splicer, fiber cleaver, stripper, OTDR, OPM, VFL laser, tangga teleskopik, obeng, palu' },
  { code: 'PAS', name: 'Perangkat Pasif FTTH (Passive)', description: 'Box ODP, Box ODC, Join Closure, Splitter PLC 1:2 / 1:4 / 1:8 / 1:16' },
  { code: 'HDW', name: 'Perangkat Keras Utama (Hardware)', description: 'MikroTik Routerboard, OLT, Printer Kantor, Kamera CCTV' },
  { code: 'SUP', name: 'Perlengkapan & ATK Kantor (Supplies)', description: 'Kertas HVS A4, pulpen, pensil, stempel, sticky note, isi staples' },
  { code: 'CBL', name: 'Kabel FTTH & Network (Cable)', description: 'Kabel Dropcore 1 Core 50m - 300m, Kabel Precon, Kabel UTP, Kabel Extender CCTV' },
  { code: 'CPE', name: 'Customer Premises Equipment (CPE / Modem)', description: 'Modem ONT ZTE, HSGQ, VSOL, Skyworth, Huawei, FiberHome, Generic' },
  { code: 'PWR', name: 'Power & Power Supply (Power)', description: 'Power Adaptor 12V 1.5A, Power Supply Unit, Mini UPS' },
];

// ─── Inventory Item Master Catalog ─────────────────────────────────────────────
const DEFAULT_INVENTORY_ITEMS = [
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
  { sku: 'HDW-CCTV-CAMERA', name: 'KAMERA CCTV', categoryCode: 'HDW', subCategory: 'CCT', unit: 'unit', packSize: 1, isSerialized: true },

  // ─── POWER & ADAPTOR (PWR) ───
  { sku: 'PWR-ADP-12V-1.5A', name: 'POWER ADAPTOR 12V 1.5A', categoryCode: 'PWR', subCategory: 'ADP', unit: 'pcs', packSize: 1, isSerialized: false },

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
  { sku: 'CBL-CCTV-EXTENDER', name: 'KABEL EXTENDER CCTV', categoryCode: 'CBL', subCategory: 'EXT', unit: 'pcs', packSize: 1, isSerialized: false },

  // ─── CPE MODEM (VENDOR MASTER ITEMS - TANPA EQUIPMENT ID) ───
  { sku: 'EMG-CPE-ONT-ZTE', name: 'Modem ONT ZTE', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-HUAWEI', name: 'Modem ONT Huawei', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-SKYWORTH', name: 'Modem ONT Skyworth', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-FIBERHOME', name: 'Modem ONT FiberHome', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-HSGQ', name: 'Modem ONT HSGQ', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-VSOL', name: 'Modem ONT VSOL', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
  { sku: 'EMG-CPE-ONT-GENERIC', name: 'Modem ONT Generic', categoryCode: 'CPE', subCategory: 'ONT', unit: 'unit', packSize: 1, isSerialized: true },
];

// ─── Standard Initial Stock Levels & Pack Size for Consumables ────────────────
const STANDARD_STOCK_LEVELS: Record<string, { qty: number; packSize?: number }> = {
  'EMG-CON-TIE-30CM-BLK': { qty: 500, packSize: 200 },
  'EMG-CON-TAP-60MM': { qty: 50, packSize: 10 },
  'EMG-CON-KLM-16MM': { qty: 300, packSize: 100 },
  'EMG-CON-PTC-FC-APC': { qty: 100, packSize: 50 },
  'EMG-CON-FOD-CLEAVE': { qty: 5 },
  'EMG-CON-PAP-A4': { qty: 5 },
  'EMG-MKT-BRC-A5': { qty: 200 },
  'EMG-MKT-STK-ODP-LOGO': { qty: 100 },
  'EMG-CON-PTC-SC-UPC-3M': { qty: 50 },
  'EMG-CON-SLV-60MM': { qty: 200 },
  'EMG-PAS-RST-1P-SCUPC': { qty: 50 },
  'EMG-CON-BAT-AAA-PAIR': { qty: 20 },
};

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret');
    const host = req.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isValidSecret = process.env.CRON_SECRET && secret === process.env.CRON_SECRET;

    if (!isLocalhost && !isValidSecret) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userRole = (session.user as { role?: string }).role;
      if (userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }

    // ── 1. Seed numbering rules ──────────────────────────────────────────────
    let rulesSeeded = 0;
    for (const rule of DEFAULT_NUMBERING_RULES) {
      await prisma.numberingRule.upsert({
        where: { category: rule.category },
        create: {
          category: rule.category,
          pattern: rule.pattern,
          resetFrequency: rule.resetFrequency,
          currentSeq: 0,
        },
        update: {},
      });
      rulesSeeded++;
    }

    // ── 2. Seed inventory categories ─────────────────────────────────────────
    const categoryMap: Record<string, string> = {};
    let categoriesSeeded = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      const record = await prisma.inventoryCategory.upsert({
        where: { name: cat.name },
        create: {
          name: cat.name,
          description: cat.description,
        },
        update: {
          description: cat.description,
        },
      });
      categoryMap[cat.code] = record.id;
      categoriesSeeded++;
    }

    // ── 3. Seed inventory item master catalog ────────────────────────────────
    let itemsSeeded = 0;
    for (const item of DEFAULT_INVENTORY_ITEMS) {
      const categoryId = categoryMap[item.categoryCode] || null;
      const initialPackSize = STANDARD_STOCK_LEVELS[item.sku]?.packSize || null;
      await prisma.inventoryItem.upsert({
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
          packSize: initialPackSize,
          isActive: true,
        },
        update: {
          name: item.name,
          categoryCode: item.categoryCode,
          subCategory: item.subCategory,
          ...(categoryId ? { categoryId } : {}),
          ...(initialPackSize ? { packSize: initialPackSize } : {}),
        },
      });
      itemsSeeded++;
    }

    // ── 4. Seed permissions & WAREHOUSE role template ──────────────────────
    try {
      const { seedPermissions } = await import('@/../prisma/seeds/permissions');
      await seedPermissions();
    } catch (permErr) {
      console.warn('Warning seeding permissions from seed-defaults:', permErr);
    }

    // ── 5. Seed 25 Physical Dropcore Rolls (5 rolls per length variant) ──────
    let rollsSeeded = 0;
    const DROPCORE_LENGTHS = [50, 100, 200, 250, 300];
    const ROLLS_PER_LENGTH = 5;

    for (const length of DROPCORE_LENGTHS) {
      const sku = `EMG-CAB-DRP-1C-${length}M`;
      const item = await prisma.inventoryItem.findUnique({ where: { sku } });
      if (!item) continue;

      for (let i = 1; i <= ROLLS_PER_LENGTH; i++) {
        const serialNumber = `ROLL-${length}M-${String(i).padStart(2, '0')}`;
        await prisma.inventoryAsset.upsert({
          where: { serialNumber },
          create: {
            itemId: item.id,
            assetType: 'CABLE_ROLL',
            serialNumber,
            initialLength: length,
            remainingLength: length,
            condition: 'NEW',
            status: 'AVAILABLE',
            notes: `Seeding fisik dropcore roll ${length}M unit #${i}`,
          },
          update: {}, // Jangan timpa roll yang sudah dipakai
        });
        rollsSeeded++;
      }
    }

    // ── 6. Seed Standard Initial Stock for Consumables ───────────────────────
    let stockItemsInitialized = 0;
    for (const [sku, { qty, packSize }] of Object.entries(STANDARD_STOCK_LEVELS)) {
      const item = await prisma.inventoryItem.findUnique({ where: { sku } });
      if (!item) continue;

      const hasMovement = await prisma.inventoryMovement.findFirst({ where: { itemId: item.id } });
      if (!hasMovement) {
        await prisma.$transaction([
          prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              currentStock: qty,
              ...(packSize ? { packSize } : {}),
            },
          }),
          prisma.inventoryMovement.create({
            data: {
              itemId: item.id,
              movementType: 'IN',
              quantity: qty,
              previousStock: 0,
              newStock: qty,
              referenceNo: 'SEED-INITIAL',
              notes: 'Stok awal seeding sistem inventori',
            },
          }),
        ]);
        stockItemsInitialized++;
      } else if (packSize && !item.packSize) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { packSize },
        });
      }
    }

    // ── 7. Seed Default Kit Standar PSB (workOrderTypeKit) ───────────────────
    let kitItemsSeeded = 0;
    const psbKit = await prisma.workOrderTypeKit.upsert({
      where: { issueType: 'INSTALLATION' },
      create: {
        issueType: 'INSTALLATION',
        name: 'Kit Standar PSB',
        isActive: true,
      },
      update: {
        name: 'Kit Standar PSB',
        isActive: true,
      },
    });

    const DEFAULT_PSB_KIT_ITEMS = [
      { sku: 'EMG-CON-TIE-30CM-BLK', defaultQty: 6 },
      { sku: 'EMG-CON-TAP-60MM', defaultQty: 1 },
      { sku: 'EMG-CON-KLM-16MM', defaultQty: 8 },
      { sku: 'EMG-CON-PTC-FC-APC', defaultQty: 1 },
    ];

    for (const kitItemDef of DEFAULT_PSB_KIT_ITEMS) {
      const targetItem = await prisma.inventoryItem.findUnique({ where: { sku: kitItemDef.sku } });
      if (targetItem) {
        await prisma.workOrderTypeKitItem.upsert({
          where: {
            kitId_itemId: {
              kitId: psbKit.id,
              itemId: targetItem.id,
            },
          },
          create: {
            kitId: psbKit.id,
            itemId: targetItem.id,
            defaultQty: kitItemDef.defaultQty,
          },
          update: {
            defaultQty: kitItemDef.defaultQty,
          },
        });
        kitItemsSeeded++;
      }
    }

    // ── 8. Seed SKU Master Dictionary (Categories & Subcategories) ──────────
    let skuStats = { categoriesCount: 0, subCategoriesCount: 0 };
    try {
      const { seedSkuDictionary } = await import('@/../prisma/seeds/sku-dictionary');
      skuStats = await seedSkuDictionary(prisma);
    } catch (skuErr) {
      console.warn('Warning seeding SKU dictionary from seed-defaults:', skuErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Default data, cable rolls, standard kit, and SKU dictionary seeded successfully',
      seeded: {
        numberingRules: rulesSeeded,
        categories: categoriesSeeded,
        inventoryItems: itemsSeeded,
        cableRolls: rollsSeeded,
        stockItemsInitialized,
        kitStandarPsbItems: kitItemsSeeded,
        skuCategories: skuStats.categoriesCount,
        skuSubCategories: skuStats.subCategoriesCount,
        permissionsUpdated: true,
      },
    });
  } catch (error) {
    console.error('Error seeding defaults:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed defaults' },
      { status: 500 }
    );
  }
}
