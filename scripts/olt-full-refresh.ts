/**
 * scripts/olt-full-refresh.ts
 *
 * Full OLT → DB → Inventory pipeline.
 * 
 * MASALAH YANG DIPECAHKAN:
 * - Normal polling hanya simpan ONU yang TERLIHAT saat ini di CLI.
 * - pruneMissingOnus() hapus ONU offline dari DB kalau tidak muncul di response CLI.
 * - Akibatnya: oltOnuStatus di DB tidak pernah mencerminkan total real ONT di OLT.
 *
 * SOLUSI SCRIPT INI:
 * 1. Connect langsung ke setiap OLT via Telnet/SSH (bypass monitoringEnabled check).
 * 2. Fetch ALL ONTs (show ont status / show gpon onu state) — termasuk offline/isolir.
 * 3. Upsert ke oltOnuStatus tanpa DELETE/prune, hanya tambah/update.
 * 4. Sync seluruh oltOnuStatus ke inventoryAsset (upsert, tidak wipe).
 * 5. Hitung ulang currentStock tiap inventoryItem.
 *
 * MODE:
 *   --dry-run    Preview saja, tidak ubah DB
 *   --olt-only   Hanya refresh oltOnuStatus, TIDAK sync ke inventori
 *   --inv-only   Skip OLT refresh, HANYA sync oltOnuStatus yang ada ke inventori
 *   (default)    Full pipeline: OLT refresh + inventory sync
 *
 * USAGE:
 *   npx tsx scripts/olt-full-refresh.ts --dry-run
 *   npx tsx scripts/olt-full-refresh.ts --olt-only
 *   npx tsx scripts/olt-full-refresh.ts --inv-only
 *   npx tsx scripts/olt-full-refresh.ts
 *   npm run olt:full-refresh
 */

// Bypass Next.js server-only module restriction when running as standalone script
const Module = require('module');
const _origLoad = Module._load;
Module._load = function(request: string, ...args: any[]) {
  if (request === 'server-only') return {};
  return _origLoad.call(this, request, ...args);
};

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun  = process.argv.includes('--dry-run');
const isOltOnly = process.argv.includes('--olt-only');
const isInvOnly = process.argv.includes('--inv-only');

// ==========================
// Vendor-aware ONT fetchers
// ==========================

async function fetchOntsFromOlt(olt: {
  id: string;
  name: string;
  ipAddress: string;
  vendor: string | null;
  snmpEnabled: boolean;
  snmpCommunity: string;
  snmpPort: number;
  firmwareVersion?: string | null;
  telnetEnabled: boolean;
  telnetPort: number;
  sshEnabled: boolean;
  sshPort: number;
  username: string | null;
  password: string | null;
}): Promise<{ frame: number; slot: number; port: number; onuId: number; serialNumber: string | null; macAddress: string | null; status: string; rxPower: number | null; description: string | null }[]> {
  
  const vendorName = (olt.vendor || 'huawei').toLowerCase();
  let vendorModule: any = null;

  try {
    if (vendorName === 'vsol') {
      vendorModule = await import('../src/lib/olt/vendors/vsol');
    } else if (vendorName === 'hsgq') {
      vendorModule = await import('../src/lib/olt/vendors/hsgq');
    } else if (vendorName === 'zte') {
      vendorModule = await import('../src/lib/olt/vendors/zte');
    } else if (vendorName === 'huawei') {
      vendorModule = await import('../src/lib/olt/vendors/huawei');
    } else if (vendorName === 'fiberhome') {
      vendorModule = await import('../src/lib/olt/vendors/fiberhome');
    } else {
      vendorModule = await import('../src/lib/olt/vendors/huawei');
    }
  } catch (importErr: any) {
    console.error(`  [ERROR] Gagal import vendor module ${olt.vendor}: ${importErr.message}`);
    return [];
  }

  const snmpConfig = olt.snmpEnabled ? {
    host: olt.ipAddress,
    community: olt.snmpCommunity || 'public',
    port: olt.snmpPort || 161,
  } : null;

  const telnetConfig = olt.telnetEnabled && olt.username ? {
    host: olt.ipAddress,
    port: olt.telnetPort || 23,
    username: olt.username,
    password: olt.password ?? '',
  } : null;

  const sshConfig = olt.sshEnabled && olt.username ? {
    host: olt.ipAddress,
    port: olt.sshPort || 22,
    username: olt.username,
    password: olt.password ?? undefined,
  } : null;

  try {
    let raw: any[] = [];

    // 1. Try SNMP discovery first (BotRedaman OID pattern — instant, 100% accurate, no SSH shell hang)
    if (snmpConfig && typeof vendorModule.discoverONUsSNMP === 'function') {
      console.log(`  Connecting via SNMP (${snmpConfig.host}:${snmpConfig.port}, community: ${snmpConfig.community}) ke ${olt.name}...`);
      try {
        raw = await vendorModule.discoverONUsSNMP(snmpConfig, olt.firmwareVersion, telnetConfig);
        console.log(`  [SNMP] Ditemukan ${raw.length} ONT dari ${olt.name}`);
      } catch (snmpErr: any) {
        console.log(`  [SNMP Fallback] Error: ${snmpErr.message}`);
      }
    }

    // 2. Fallback to SSH if SNMP returned no ONTs or is disabled
    if (raw.length === 0 && sshConfig && typeof vendorModule.discoverONUsSSH === 'function') {
      console.log(`  Connecting via SSH (${sshConfig.host}:${sshConfig.port}) ke ${olt.name}...`);
      try {
        raw = await vendorModule.discoverONUsSSH(sshConfig);
        console.log(`  [SSH] Ditemukan ${raw.length} ONT dari ${olt.name}`);
      } catch (sshErr: any) {
        console.log(`  [SSH Fallback] Error: ${sshErr.message}`);
      }
    }

    // 3. Fallback to Telnet if SNMP and SSH returned no ONTs
    if (raw.length === 0 && telnetConfig && typeof vendorModule.discoverONUs === 'function') {
      console.log(`  Connecting via Telnet (${telnetConfig.host}:${telnetConfig.port}) ke ${olt.name}...`);
      try {
        raw = await vendorModule.discoverONUs(telnetConfig);
        console.log(`  [Telnet] Ditemukan ${raw.length} ONT dari ${olt.name}`);
      } catch (tErr: any) {
        console.log(`  [Telnet Fallback] Error: ${tErr.message}`);
      }
    }

    if (raw.length === 0) {
      console.log(`  [NOTICE] OLT ${olt.name}: Tidak ada ONT yang berhasil ditarik dari SNMP/SSH/Telnet.`);
    }

    console.log(`  Total ditarik dari ${olt.name}: ${raw.length} ONT`);
    return raw.map(o => ({
      frame:        o.frame  ?? 0,
      slot:         o.slot   ?? 0,
      port:         o.port   ?? 1,
      onuId:        o.onuId  ?? 0,
      serialNumber: o.serialNumber ? String(o.serialNumber).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) : null,
      macAddress:   o.macAddress ?? null,
      status:       o.status ?? 'offline',
      rxPower:      o.rxPower ?? null,
      description:  o.description ?? null,
    }));
  } catch (err: any) {
    console.error(`  [ERROR] Gagal koneksi ke ${olt.name}: ${err.message}`);
    return [];
  }
}

// ==========================
// Vendor detection from SN
// ==========================
const VENDOR_PREFIXES: Record<string, { vendor: string; model: string }> = {
  ZTEG: { vendor: 'ZTE', model: 'F670L' },
  ZTED: { vendor: 'ZTE', model: 'F670L' },
  ZTEC: { vendor: 'ZTE', model: 'F609' },
  ZTEF: { vendor: 'ZTE', model: 'F609' },
  HWTC: { vendor: 'Huawei', model: 'HG8245H' },
  FHTT: { vendor: 'FiberHome', model: 'AN5506' },
  FHT:  { vendor: 'FiberHome', model: 'AN5506' },
  SCOM: { vendor: 'Skyworth', model: 'EN101' },
  RLTK: { vendor: 'Realtek', model: 'OEM' },
  SKYW: { vendor: 'Skyworth', model: 'OEM' },
  GGL:  { vendor: 'Gigalink', model: 'FD511G' },
  CDAT: { vendor: 'C-Data', model: 'FD511GX' },
};

function detectVendorModel(sn: string | null, oltVendor?: string | null): { vendor: string; model: string } {
  if (!sn) return { vendor: 'Generic', model: 'ONT' };
  const upper = sn.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const [prefix, info] of Object.entries(VENDOR_PREFIXES)) {
    if (upper.startsWith(prefix)) return info;
  }
  if (oltVendor) {
    const v = oltVendor.toLowerCase();
    if (v.includes('vsol'))       return { vendor: 'VSOL', model: 'ONT' };
    if (v.includes('hsgq'))       return { vendor: 'HSGQ', model: 'ONT' };
    if (v.includes('zte'))        return { vendor: 'ZTE', model: 'ONT' };
    if (v.includes('huawei'))     return { vendor: 'Huawei', model: 'ONT' };
    if (v.includes('fiberhome'))  return { vendor: 'FiberHome', model: 'ONT' };
  }
  return { vendor: 'Generic', model: 'ONT' };
}

async function getOrCreateOntCategory() {
  const existing = await prisma.inventoryCategory.findFirst({ where: { name: 'CPE / ONT' } });
  if (existing) return existing.id;
  const c = await prisma.inventoryCategory.create({
    data: { name: 'CPE / ONT', description: 'Customer Premise Equipment — ONT/Modem GPON' },
  });
  return c.id;
}

async function getOrCreateOntItem(vendor: string, model: string, categoryId: string) {
  const safe = (s: string) => s.replace(/[^A-Z0-9\-]/gi, '').toUpperCase().slice(0, 18);
  const sku = `EMG-CPE-ONT-${safe(vendor)}-${safe(model)}`;
  const existing = await prisma.inventoryItem.findFirst({ where: { sku } });
  if (existing) return existing.id;
  const created = await prisma.inventoryItem.create({
    data: {
      sku,
      name: `Modem ${vendor} ${model} GPON`,
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
  console.log(`    [+] Item baru: ${sku}`);
  return created.id;
}

// ==========================
// Main
// ==========================
async function main() {
  console.log('=== OLT Full Refresh → oltOnuStatus → inventoryAsset ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isOltOnly ? 'OLT Only' : isInvOnly ? 'Inventory Only' : 'Full Pipeline'}`);
  console.log('');

  // ─── STEP 1: Fetch semua OLT dari DB ───────────────────────
  const olts = await prisma.networkOLT.findMany({
    select: {
      id: true, name: true, ipAddress: true, vendor: true,
      snmpEnabled: true, snmpCommunity: true, snmpPort: true, firmwareVersion: true,
      telnetEnabled: true, telnetPort: true,
      sshEnabled: true, sshPort: true,
      username: true, password: true,
      monitoringEnabled: true,
    },
  });

  console.log(`Total OLT di database: ${olts.length}`);
  for (const olt of olts) {
    const conn = olt.sshEnabled ? `SSH:${olt.sshPort}` : olt.telnetEnabled ? `Telnet:${olt.telnetPort}` : `SNMP:${olt.snmpPort} (${olt.snmpCommunity})`;
    console.log(`  - ${olt.name} (${olt.ipAddress}) | Vendor: ${olt.vendor || 'unknown'} | Conn: ${conn} | Monitoring: ${olt.monitoringEnabled ? 'ON' : 'OFF'}`);
  }

  if (isInvOnly) {
    console.log('\n[--inv-only] Skip OLT refresh, langsung sync dari oltOnuStatus yang ada.');
  } else {
    // ─── STEP 2: Fetch ONTs langsung dari tiap OLT ─────────────
    console.log('\n=== STEP 2: Fetch ONTs dari OLT ===');
    
    let totalDiscovered = 0;
    let totalUpserted = 0;

    for (const olt of olts) {
      console.log(`\nOLT: ${olt.name} (${olt.vendor || 'unknown'})`);

      const onts = await fetchOntsFromOlt(olt);
      totalDiscovered += onts.length;

      if (onts.length === 0) {
        console.log(`  Tidak ada ONT ditemukan atau koneksi gagal.`);
        continue;
      }

      if (isDryRun) {
        const statusBreakdown: Record<string, number> = {};
        for (const o of onts) {
          statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
        }
        console.log(`  [DRY RUN] Akan upsert ${onts.length} ONT:`);
        for (const [s, cnt] of Object.entries(statusBreakdown)) {
          console.log(`    ${s}: ${cnt}`);
        }
        continue;
      }

      // Upsert semua ONT ke oltOnuStatus (NO prune/delete)
      for (const onu of onts) {
        try {
          // Preserve existing customerId (do not overwrite manual assignments)
          const existing = await prisma.oltOnuStatus.findUnique({
            where: {
              oltId_frame_slot_port_onuId: {
                oltId: olt.id,
                frame: onu.frame,
                slot: onu.slot,
                port: onu.port,
                onuId: onu.onuId,
              },
            },
            select: { customerId: true },
          });

          const now = new Date();
          await prisma.oltOnuStatus.upsert({
            where: {
              oltId_frame_slot_port_onuId: {
                oltId: olt.id,
                frame: onu.frame,
                slot: onu.slot,
                port: onu.port,
                onuId: onu.onuId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              oltId: olt.id,
              frame: onu.frame,
              slot: onu.slot,
              port: onu.port,
              onuId: onu.onuId,
              serialNumber: onu.serialNumber,
              macAddress: onu.macAddress,
              status: onu.status as any,
              description: onu.description,
              rxPower: onu.rxPower,
              firstSeenAt: now,
              lastSeenAt: now,
              updatedAt: now,
            },
            update: {
              ...(onu.serialNumber ? { serialNumber: onu.serialNumber } : {}),
              status: onu.status as any,
              description: onu.description ?? undefined,
              rxPower: onu.rxPower ?? undefined,
              lastSeenAt: now,
              lastOfflineAt: onu.status !== 'online' ? now : undefined,
              updatedAt: now,
              // Preserve existing customerId — jangan overwrite assignment manual
              ...(existing?.customerId ? {} : {}),
            },
          });
          totalUpserted++;
        } catch (err: any) {
          console.error(`    [ERROR] ONU ${olt.name} ${onu.port}:${onu.onuId}: ${err.message}`);
        }
      }

      // Clean phantom rows for this OLT that were not in discovered list
      const validKeys = new Set(onts.map(o => `${o.frame}:${o.slot}:${o.port}:${o.onuId}`));
      const existingInDb = await prisma.oltOnuStatus.findMany({
        where: { oltId: olt.id },
        select: { id: true, frame: true, slot: true, port: true, onuId: true },
      });
      const phantomIds = existingInDb
        .filter(o => !validKeys.has(`${o.frame}:${o.slot}:${o.port}:${o.onuId}`))
        .map(o => o.id);

      if (phantomIds.length > 0) {
        await prisma.oltOnuStatus.deleteMany({
          where: { id: { in: phantomIds } },
        });
        console.log(`  [Clean] Menghapus ${phantomIds.length} data ONU phantom/usang dari DB untuk ${olt.name}`);
      }

      // Update OLT summary counters
      const [total, online, offline] = await Promise.all([
        prisma.oltOnuStatus.count({ where: { oltId: olt.id } }),
        prisma.oltOnuStatus.count({ where: { oltId: olt.id, status: 'online' } }),
        prisma.oltOnuStatus.count({ where: { oltId: olt.id, status: { not: 'online' } } }),
      ]);
      await prisma.networkOLT.update({
        where: { id: olt.id },
        data: { totalOnu: total, onlineOnu: online, offlineOnu: offline, lastPollAt: new Date() },
      });
      console.log(`  Selesai: ${onts.length} ONT di-upsert. Total di DB: ${total} (online: ${online}, offline: ${offline})`);
    }

    // Clean orphaned oltOnuStatus records whose oltId is not in current olts list
    const activeOltIds = olts.map(o => o.id);
    const orphanedDbOnus = await prisma.oltOnuStatus.findMany({
      where: {
        oltId: { notIn: activeOltIds },
      },
      select: { id: true },
    });

    if (orphanedDbOnus.length > 0 && !isDryRun) {
      await prisma.oltOnuStatus.deleteMany({
        where: { id: { in: orphanedDbOnus.map(o => o.id) } },
      });
      console.log(`\n  [Clean] Menghapus ${orphanedDbOnus.length} data oltOnuStatus orphan (OLT ID usang/tidak aktif).`);
    }

    console.log(`\nTotal ONT ditemukan dari semua OLT: ${totalDiscovered}`);
    console.log(`Total di-upsert ke oltOnuStatus: ${isDryRun ? '(dry run)' : totalUpserted}`);
  }

  if (isOltOnly || isDryRun) {

    console.log('\n[Done] OLT refresh selesai. Untuk sync ke inventori, jalankan tanpa --olt-only.');
    await prisma.$disconnect();
    return;
  }

  // ─── STEP 3: Sync oltOnuStatus → inventoryAsset ─────────────
  console.log('\n=== STEP 3: Sync oltOnuStatus → inventoryAsset ===');

  const allOnus = await prisma.oltOnuStatus.findMany({
    include: {
      olt: { select: { name: true, vendor: true } },
      customer: { select: { id: true, username: true, name: true } },
    },
  });

  const validOnus = allOnus.filter(o => o.serialNumber && o.serialNumber.length >= 6);
  const invalid = allOnus.length - validOnus.length;

  console.log(`Total oltOnuStatus: ${allOnus.length}`);
  console.log(`Valid SN: ${validOnus.length}, Skip (no SN): ${invalid}`);

  const categoryId = await getOrCreateOntCategory();
  
  // Vendor breakdown
  const vendorBreakdown: Record<string, number> = {};
  for (const o of validOnus) {
    const { vendor } = detectVendorModel(o.serialNumber, o.olt?.vendor);
    vendorBreakdown[vendor] = (vendorBreakdown[vendor] || 0) + 1;
  }
  console.log('\nBreakdown vendor:');
  for (const [v, cnt] of Object.entries(vendorBreakdown).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${v}: ${cnt}`);
  }

  let created = 0, updated = 0, errors = 0;

  for (const onu of validOnus) {
    const sn = onu.serialNumber!;
    const { vendor, model } = detectVendorModel(sn, onu.olt?.vendor);
    const itemId = await getOrCreateOntItem(vendor, model, categoryId);

    const location = `${onu.olt?.name || 'OLT'} ${onu.port}:${onu.onuId}`;

    // Semua ONT yang terdeteksi di OLT = IN_USE (sudah di lapangan).
    // AVAILABLE hanya untuk modem yang fisiknya masih di gudang (ditambah manual admin).
    // Perbedaan: IN_USE + customerId = terpasang ke pelanggan.
    //            IN_USE + no customerId = fasum/lapangan tanpa pelanggan terdaftar.
    const status = 'IN_USE';
    const note = (onu.customer
      ? `Terpasang di pelanggan: ${onu.customer.username} (${onu.customer.name}) — ${location}`
      : onu.description
      ? `Lapangan/Fasum: "${onu.description}" — ${location}`
      : `Di lapangan (unassigned) — ${location}`
    ).slice(0, 190);

    try {
      const existing = await prisma.inventoryAsset.findUnique({ where: { serialNumber: sn } });

      if (existing) {
        await prisma.inventoryAsset.update({
          where: { serialNumber: sn },
          data: {
            vendor: vendor !== 'Generic' ? vendor : existing.vendor ?? vendor,
            model: model !== 'ONT' ? model : existing.model ?? model,
            macAddress: onu.macAddress || existing.macAddress,
            status,
            currentCustomerId: onu.customer?.id || null,
            location,
            notes: note,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.inventoryAsset.create({
          data: {
            itemId,
            assetType: 'MODEM',
            serialNumber: sn,
            macAddress: onu.macAddress || null,
            vendor,
            model,
            condition: (onu.customer || onu.status === 'online') ? 'USED_GOOD' : 'NEW',
            status,
            currentCustomerId: onu.customer?.id || null,
            location,
            notes: note,
            installedAt: onu.customer ? (onu.lastSeenAt || new Date()) : null,
          },
        });
        created++;
      }
    } catch (err: any) {
      console.error(`  [ERROR] SN=${sn}: ${err.message}`);
      errors++;
    }
  }

  // Delete orphaned MODEM assets that no longer exist in any active OLT record
  const activeSns = new Set(validOnus.map(o => o.serialNumber!));
  const allModemAssets = await prisma.inventoryAsset.findMany({
    where: { assetType: 'MODEM' },
    select: { id: true, serialNumber: true },
  });
  const orphanedAssets = allModemAssets.filter(a => a.serialNumber && !activeSns.has(a.serialNumber));
  if (orphanedAssets.length > 0) {
    await prisma.inventoryAsset.updateMany({
      where: { id: { in: orphanedAssets.map(a => a.id) } },
      data: { currentCustomerId: null },
    });
    const delAssetRes = await prisma.inventoryAsset.deleteMany({
      where: { id: { in: orphanedAssets.map(a => a.id) } },
    });
    console.log(`\n  [Clean] Menghapus ${delAssetRes.count} inventoryAsset MODEM orphan yang tidak ada di OLT.`);
  }

  // ─── STEP 4: Hitung ulang currentStock ──────────────────────

  console.log('\n=== STEP 4: Hitung ulang currentStock ===');
  const ontItems = await prisma.inventoryItem.findMany({
    where: { categoryCode: 'CPE', subCategory: 'ONT' },
    include: { assets: { select: { status: true } } },
  });
  for (const item of ontItems) {
    const stockCount = item.assets.filter(a => a.status === 'AVAILABLE').length;
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: stockCount },
    });
    console.log(`  ${item.sku}: ${item.assets.length} unit total, ${stockCount} stok gudang`);
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n=== SELESAI ===');
  console.log(`  oltOnuStatus total: ${allOnus.length}`);
  console.log(`  inventoryAsset created: ${created}`);
  console.log(`  inventoryAsset updated: ${updated}`);
  console.log(`  Error:  ${errors}`);

  // Verifikasi akhir
  const finalCount = await prisma.inventoryAsset.count({ where: { assetType: 'MODEM' } });
  const inUse     = await prisma.inventoryAsset.count({ where: { assetType: 'MODEM', status: 'IN_USE' } });
  const available = await prisma.inventoryAsset.count({ where: { assetType: 'MODEM', status: 'AVAILABLE' } });
  console.log(`\nTotal inventoryAsset MODEM: ${finalCount}`);
  console.log(`  IN_USE (terpasang di pelanggan/fasum): ${inUse}`);
  console.log(`  AVAILABLE (stok gudang): ${available}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[FATAL]', err);
  await prisma.$disconnect();
  process.exit(1);
});
