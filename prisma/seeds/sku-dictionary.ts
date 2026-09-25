import { PrismaClient } from '@prisma/client';

export const SKU_CATEGORIES = [
  { code: 'HW',  label: 'Hardware Utama (HW)', sortOrder: 1 },
  { code: 'HDW', label: 'Perangkat Keras Utama (HDW)', sortOrder: 2 },
  { code: 'CPE', label: 'Customer Equipment (CPE)', sortOrder: 3 },
  { code: 'PAS', label: 'Perangkat Pasif FTTH (PAS)', sortOrder: 4 },
  { code: 'CAB', label: 'Kabel & Dropcore (CAB)', sortOrder: 5 },
  { code: 'CBL', label: 'Kabel FTTH & Network (CBL)', sortOrder: 6 },
  { code: 'CON', label: 'Bahan Habis Pakai / Consumable (CON)', sortOrder: 7 },
  { code: 'CNS', label: 'Bahan Habis Pakai / Consumable (CNS)', sortOrder: 8 },
  { code: 'MKT', label: 'Materi Marketing (MKT)', sortOrder: 9 },
  { code: 'PWR', label: 'Power Equipment (PWR)', sortOrder: 10 },
  { code: 'TLS', label: 'Tools / Alat Kerja (TLS)', sortOrder: 11 },
  { code: 'ACC', label: 'Accessories & Aksesoris (ACC)', sortOrder: 12 },
  { code: 'SUP', label: 'Office Supplies / ATK (SUP)', sortOrder: 13 },
];

export const SKU_SUBCATEGORIES = [
  // HW - Hardware Utama
  { categoryCode: 'HW',  code: 'OLT', label: 'Optical Line Terminal (OLT)', requiresBrand: true },
  { categoryCode: 'HW',  code: 'ROU', label: 'Router Core / Mikrotik', requiresBrand: true },
  { categoryCode: 'HW',  code: 'SWI', label: 'Switch / Hub',          requiresBrand: true },
  { categoryCode: 'HW',  code: 'SRV', label: 'Server / Mini PC',      requiresBrand: true },
  { categoryCode: 'HW',  code: 'PRN', label: 'Printer Kantor',        requiresBrand: true },

  // CPE - Customer Equipment
  { categoryCode: 'CPE', code: 'ONT', label: 'Modem ONT / ONU (ZTE, Huawei, Skyworth, FiberHome, HSGQ, VSOL)', requiresBrand: true },
  { categoryCode: 'CPE', code: 'STB', label: 'Set Top Box (STB)',     requiresBrand: true },
  { categoryCode: 'CPE', code: 'RTR', label: 'Home Router / Extender', requiresBrand: true },

  // PAS - Passive Equipment
  { categoryCode: 'PAS', code: 'ODP', label: 'Box ODP (Optical Distribution Point)', requiresBrand: false },
  { categoryCode: 'PAS', code: 'ODC', label: 'Box ODC (Optical Distribution Cabinet)', requiresBrand: false },
  { categoryCode: 'PAS', code: 'SPL', label: 'Splitter Optik (1:2, 1:4, 1:8, 1:16)', requiresBrand: false },
  { categoryCode: 'PAS', code: 'CLS', label: 'Join Closure',         requiresBrand: false },
  { categoryCode: 'PAS', code: 'RST', label: 'Roset Fiber',           requiresBrand: false },

  // CAB - Cables
  { categoryCode: 'CAB', code: 'DRP', label: 'Dropcore 1 Core (50m - 300m)', requiresBrand: false },
  { categoryCode: 'CAB', code: 'PRC', label: 'Kabel Precon', requiresBrand: false },
  { categoryCode: 'CAB', code: 'UTP', label: 'UTP / LAN Cat5/Cat6',   requiresBrand: false },
  { categoryCode: 'CAB', code: 'PWR', label: 'Kabel Power / Listrik', requiresBrand: false },

  // CON / CNS - Consumables
  { categoryCode: 'CON', code: 'PTC', label: 'Patch Cord SC-UPC to SC-UPC',  requiresBrand: false },
  { categoryCode: 'CON', code: 'FOD', label: 'Protection Sleeve FO (Besar & Kecil)', requiresBrand: false },
  { categoryCode: 'CON', code: 'TAP', label: 'Isolasi Hitam',        requiresBrand: false },
  { categoryCode: 'CON', code: 'TIE', label: 'Kabel Ties (10cm, 20cm, 30cm)', requiresBrand: false },
  { categoryCode: 'CON', code: 'KLM', label: 'Paku Klem',             requiresBrand: false },
  { categoryCode: 'CON', code: 'BRL', label: 'Adapter / Barrel FO',  requiresBrand: false },
  { categoryCode: 'CON', code: 'LBL', label: 'Brand Label Modem (Large & Small)', requiresBrand: false },
  { categoryCode: 'CON', code: 'BAT', label: 'Baterai Remote AAA',    requiresBrand: false },

  { categoryCode: 'CNS', code: 'PTC', label: 'Patch Cord SC-UPC to SC-UPC',  requiresBrand: false },
  { categoryCode: 'CNS', code: 'FOD', label: 'Protection Sleeve FO (Besar & Kecil)', requiresBrand: false },
  { categoryCode: 'CNS', code: 'TAP', label: 'Isolasi Hitam',        requiresBrand: false },
  { categoryCode: 'CNS', code: 'TIE', label: 'Kabel Ties (10cm, 20cm, 30cm)', requiresBrand: false },
  { categoryCode: 'CNS', code: 'KLM', label: 'Paku Klem',             requiresBrand: false },
  { categoryCode: 'CNS', code: 'BRL', label: 'Adapter / Barrel FO',  requiresBrand: false },
  { categoryCode: 'CNS', code: 'LBL', label: 'Brand Label Modem (Large & Small)', requiresBrand: false },
  { categoryCode: 'CNS', code: 'BAT', label: 'Baterai Remote AAA',    requiresBrand: false },

  // MKT - Marketing Material
  { categoryCode: 'MKT', code: 'BRC', label: 'Brosur A5 Art Paper 150', requiresBrand: false },
  { categoryCode: 'MKT', code: 'STK', label: 'Stiker / Label ODP',    requiresBrand: false },
  { categoryCode: 'MKT', code: 'BNR', label: 'Banner / Spanduk',      requiresBrand: false },

  // PWR - Power Equipment
  { categoryCode: 'PWR', code: 'ADP', label: 'Power Adaptor 12V 1.5A',     requiresBrand: true },
  { categoryCode: 'PWR', code: 'UPS', label: 'Mini UPS Backup',       requiresBrand: true },
  { categoryCode: 'PWR', code: 'POE', label: 'PoE Injector / Splitter', requiresBrand: true },

  // HDW / HW - CCTV & Extender
  { categoryCode: 'HDW', code: 'CCT', label: 'Kamera CCTV & Keamanan', requiresBrand: true },
  { categoryCode: 'HW',  code: 'CCT', label: 'Kamera CCTV & Keamanan', requiresBrand: true },

  // CBL - Cable Extender
  { categoryCode: 'CBL', code: 'EXT', label: 'Kabel Extender CCTV / LAN Extension', requiresBrand: false },
  { categoryCode: 'CAB', code: 'EXT', label: 'Kabel Extender CCTV / LAN Extension', requiresBrand: false },

  // TLS - Tools / Alat Kerja
  { categoryCode: 'TLS', code: 'FUS', label: 'Fusion Splicer',        requiresBrand: true },
  { categoryCode: 'TLS', code: 'OPM', label: 'Optical Power Meter (OPM)', requiresBrand: true },
  { categoryCode: 'TLS', code: 'OTD', label: 'Optical Time Domain Reflectometer (OTDR)', requiresBrand: true },
  { categoryCode: 'TLS', code: 'HLS', label: 'Handheld Light Source (HLS)', requiresBrand: true },
  { categoryCode: 'TLS', code: 'VFL', label: 'Fiber Optic Visual Fault Locator (Laser)', requiresBrand: true },
  { categoryCode: 'TLS', code: 'CLV', label: 'Fiber Cleaver',         requiresBrand: true },
  { categoryCode: 'TLS', code: 'STP', label: 'Fiber Stripper & Drop Cable Stripper', requiresBrand: false },
  { categoryCode: 'TLS', code: 'LDR', label: 'Tangga Teleskopik',    requiresBrand: false },
  { categoryCode: 'TLS', code: 'TLP', label: 'Label Printer Portable', requiresBrand: true },
  { categoryCode: 'TLS', code: 'TLH', label: 'Palu & Obeng (Kembang/Min)', requiresBrand: false },

  // ACC - Accessories
  { categoryCode: 'ACC', code: 'FSH', label: 'Fishbone / Clamp Buaya', requiresBrand: false },
  { categoryCode: 'ACC', code: 'BRK', label: 'Bracket Tiang / ODP',   requiresBrand: false },
  { categoryCode: 'ACC', code: 'SPR', label: 'Spiral Wrapping Band',  requiresBrand: false },

  // SUP - Office Supplies
  { categoryCode: 'SUP', code: 'PAP', label: 'Kertas HVS A4',         requiresBrand: false },
  { categoryCode: 'SUP', code: 'ATK', label: 'Pulpen, Pensil & Sticky Note', requiresBrand: false },
  { categoryCode: 'SUP', code: 'STP', label: 'Paper Staples & Stamp Stempel', requiresBrand: false },
  { categoryCode: 'SUP', code: 'ENV', label: 'Amplop Surat Tagihan',  requiresBrand: false },
];

export async function seedSkuDictionary(prismaClient?: PrismaClient) {
  const db = prismaClient || new PrismaClient();

  console.log('📦 Seeding SKU dictionary categories...');
  let categoriesCount = 0;
  for (const cat of SKU_CATEGORIES) {
    await db.skuCategoryCode.upsert({
      where: { code: cat.code },
      create: {
        code: cat.code,
        label: cat.label,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      update: {
        label: cat.label,
        sortOrder: cat.sortOrder,
      },
    });
    categoriesCount++;
  }

  console.log('🏷️ Seeding SKU dictionary sub-categories...');
  let subCategoriesCount = 0;
  for (const sub of SKU_SUBCATEGORIES) {
    await db.skuSubCategoryCode.upsert({
      where: {
        categoryCode_code: {
          categoryCode: sub.categoryCode,
          code: sub.code,
        },
      },
      create: {
        categoryCode: sub.categoryCode,
        code: sub.code,
        label: sub.label,
        requiresBrand: sub.requiresBrand,
        isActive: true,
      },
      update: {
        label: sub.label,
        requiresBrand: sub.requiresBrand,
      },
    });
    subCategoriesCount++;
  }

  return { categoriesCount, subCategoriesCount };
}
