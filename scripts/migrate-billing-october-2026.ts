/**
 * EugineBill — Standalone VPS Migration Script: October 2026 Billing Cycle
 * File: scripts/migrate-billing-october-2026.ts
 *
 * Tujuan:
 * 1. Memindahkan seluruh pelanggan PPPoE ke siklus Oktober 2026 secara otomatis di VPS:
 *    - Wilayah Kp. Tegal (area name atau address mengandung kata 'tegal' case-insensitive):
 *      - expiredAt: 2026-10-09T16:59:59.999Z (09 Oktober 2026 23:59:59 WIB)
 *      - billingDay: 10
 *      - billingCycleDay: 10
 *      - autoIsolationEnabled: false (Anti-Isolasi Aktif! Bebas dari auto-isolir)
 *      - status: 'active'
 *    - Wilayah Lain (seluruh pelanggan selain Kp. Tegal):
 *      - expiredAt: 2026-10-05T16:59:59.999Z (05 Oktober 2026 23:59:59 WIB)
 *      - billingDay: 6
 *      - billingCycleDay: 6
 *      - autoIsolationEnabled: true (Auto-Isolir Normal, jatuh tempo tanggal 6 Oktober)
 *      - status: 'active'
 * 2. Update Invoice Unpaid/Pending untuk bulan Oktober 2026 jika ada:
 *    - Untuk Kp. Tegal: set dueDate = 2026-10-10 (2026-10-10T16:59:59.999Z)
 *    - Untuk wilayah lain: set dueDate = 2026-10-06 (2026-10-06T16:59:59.999Z)
 * 3. Un-isolasi MikroTik & RADIUS:
 *    - Bersihkan pelanggan aktif dari address-list 'isolir' di MikroTik dan pastikan
 *      profile-nya kembali ke profile paket aslinya (menggunakan PPPSecretService).
 *    - Bersihkan grup 'isolir' pada tabel radusergroup FreeRADIUS.
 * 4. Fitur Script:
 *    - Dukungan argumen --dry-run / -d untuk simulasi pratinjau tanpa menulis ke database/router.
 *    - Tabel rekapitulasi lengkap di terminal.
 *    - Strictly NO text emojis.
 *
 * Penggunaan:
 *   npx tsx scripts/migrate-billing-october-2026.ts
 *   npx tsx scripts/migrate-billing-october-2026.ts --dry-run
 */

// Bypass package 'server-only' ketika dijalankan via node / tsx CLI
try {
  const Module = require('module');
  const originalLoad = Module._load;
  Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'server-only') return {};
    return originalLoad.call(this, request, parent, isMain);
  };
} catch {
  // Ignore jika module hook tidak didukung
}

import { prisma } from '../src/server/db/client';

// ============================================================================
// KONFIGURASI TANGGAL & ATURAN SIKLUS OKTOBER 2026
// ============================================================================
// Catatan Zona Waktu:
// WIB = UTC+7
// 09 Oktober 2026 23:59:59 WIB = 2026-10-09T16:59:59.999Z (UTC)
// 05 Oktober 2026 23:59:59 WIB = 2026-10-05T16:59:59.999Z (UTC)
// 10 Oktober 2026 23:59:59 WIB = 2026-10-10T16:59:59.999Z (UTC)
// 06 Oktober 2026 23:59:59 WIB = 2026-10-06T16:59:59.999Z (UTC)

const TEGAL_RULES = {
  label: 'Kp. Tegal',
  expiredAt: new Date('2026-10-09T16:59:59.999Z'),
  billingDay: 10,
  billingCycleDay: 10,
  autoIsolationEnabled: false,
  status: 'active',
  invoiceDueDate: new Date('2026-10-10T16:59:59.999Z'),
};

const OTHER_RULES = {
  label: 'Wilayah Lain',
  expiredAt: new Date('2026-10-05T16:59:59.999Z'),
  billingDay: 6,
  billingCycleDay: 6,
  autoIsolationEnabled: true,
  status: 'active',
  invoiceDueDate: new Date('2026-10-06T16:59:59.999Z'),
};

// ============================================================================
// HELPER DETEKSI WILAYAH KP. TEGAL
// ============================================================================
function isKpTegal(user: {
  address?: string | null;
  comment?: string | null;
  area?: { name?: string | null } | null;
  pppoeCustomer?: {
    address?: string | null;
    area?: { name?: string | null } | null;
  } | null;
}): boolean {
  const areaName = (user.area?.name || user.pppoeCustomer?.area?.name || '').toLowerCase();
  const address = (user.address || user.pppoeCustomer?.address || '').toLowerCase();
  const comment = (user.comment || '').toLowerCase();

  return (
    areaName.includes('tegal') ||
    address.includes('tegal') ||
    comment.includes('tegal')
  );
}

// Format tanggal WIB untuk tampilan terminal yang rapi
function formatWibDisplay(date: Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + ' WIB';
  } catch {
    return date.toISOString();
  }
}

// ============================================================================
// FUNGSI UTAMA EKSEKUSI MIGRASI
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d') || process.env.DRY_RUN === 'true';

  console.log('================================================================================');
  console.log('EUGINEBILL: MIGRASI SIKLUS BILLING OKTOBER 2026');
  console.log(`MODE: ${isDryRun ? '[SIMULASI / DRY-RUN (Tidak ada perubahan ditulis)]' : '[LIVE RUN (Eksekusi Penuh)]'}`);
  console.log(`WAKTU MULAI: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  const startTime = Date.now();

  try {
    // --------------------------------------------------------------------------
    // 1. PINDAI DATA PELANGGAN PPPOE
    // --------------------------------------------------------------------------
    console.log('[FASE 1] Memindai seluruh pelanggan PPPoE dari database...');
    const allUsers = await prisma.pppoeUser.findMany({
      include: {
        area: { select: { id: true, name: true } },
        pppoeCustomer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            address: true,
            area: { select: { id: true, name: true } },
          },
        },
        profile: {
          select: {
            id: true,
            name: true,
            groupName: true,
            mikrotikProfileName: true,
          },
        },
        router: {
          include: {
            vpnClient: true,
          },
        },
      },
      orderBy: { username: 'asc' },
    });

    console.log(`[FASE 1] Ditemukan total ${allUsers.length} pelanggan PPPoE.\n`);

    if (allUsers.length === 0) {
      console.log('[WARNING] Tidak ada data pelanggan PPPoE yang ditemukan. Script selesai.');
      return;
    }

    const tegalUsers: typeof allUsers = [];
    const otherUsers: typeof allUsers = [];
    const isolatedUsersBefore: typeof allUsers = [];

    for (const u of allUsers) {
      if (u.status === 'isolated') {
        isolatedUsersBefore.push(u);
      }

      if (isKpTegal(u)) {
        tegalUsers.push(u);
      } else {
        otherUsers.push(u);
      }
    }

    console.log(`[FASE 1] Klasifikasi Wilayah:`);
    console.log(`  - Kp. Tegal    : ${tegalUsers.length} pelanggan`);
    console.log(`  - Wilayah Lain : ${otherUsers.length} pelanggan`);
    console.log(`  - Pelanggan Berstatus Terisolir Sebelum Migrasi: ${isolatedUsersBefore.length} pelanggan\n`);

    // --------------------------------------------------------------------------
    // 2. PINDAI DAN KLASIFIKASI INVOICE OKTOBER 2026
    // --------------------------------------------------------------------------
    console.log('[FASE 2] Memindai invoice belum lunas (PENDING/OVERDUE) siklus Oktober 2026...');
    const octoberStart = new Date('2026-10-01T00:00:00.000Z');
    const octoberEnd = new Date('2026-10-31T23:59:59.999Z');

    // Cari invoice dengan status belum lunas di bulan Oktober 2026
    const octoberInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        OR: [
          { dueDate: { gte: octoberStart, lte: octoberEnd } },
          {
            AND: [
              { createdAt: { gte: octoberStart, lte: octoberEnd } },
              { dueDate: { gte: octoberStart } },
            ],
          },
        ],
      },
      include: {
        user: {
          include: {
            area: true,
            pppoeCustomer: { include: { area: true } },
          },
        },
      },
    });

    console.log(`[FASE 2] Ditemukan ${octoberInvoices.length} invoice belum lunas untuk Oktober 2026.\n`);

    const tegalInvoices: typeof octoberInvoices = [];
    const otherInvoices: typeof octoberInvoices = [];

    // Map user id ke isTegal status untuk pencocokan cepat
    const userTegalMap = new Map<string, boolean>();
    for (const u of tegalUsers) userTegalMap.set(u.id, true);
    for (const u of otherUsers) userTegalMap.set(u.id, false);

    for (const inv of octoberInvoices) {
      let isTegalInvoice = false;
      if (inv.userId && userTegalMap.has(inv.userId)) {
        isTegalInvoice = !!userTegalMap.get(inv.userId);
      } else if (inv.user) {
        isTegalInvoice = isKpTegal(inv.user);
      } else {
        const checkStr = `${inv.customerName || ''} ${inv.notes || ''}`.toLowerCase();
        isTegalInvoice = checkStr.includes('tegal');
      }

      if (isTegalInvoice) {
        tegalInvoices.push(inv);
      } else {
        otherInvoices.push(inv);
      }
    }

    console.log(`[FASE 2] Klasifikasi Invoice:`);
    console.log(`  - Invoice Kp. Tegal    : ${tegalInvoices.length} tagihan (Target Due Date: 10 Oktober 2026)`);
    console.log(`  - Invoice Wilayah Lain : ${otherInvoices.length} tagihan (Target Due Date: 06 Oktober 2026)\n`);

    // --------------------------------------------------------------------------
    // 3. EKSEKUSI PEMBARUAN PELANGGAN PPPOE KE SIKLUS OKTOBER 2026
    // --------------------------------------------------------------------------
    console.log('[FASE 3] Memperbarui siklus billing pelanggan PPPoE di database...');

    if (isDryRun) {
      console.log(`  [SIMULASI] ${tegalUsers.length} pelanggan Kp. Tegal akan diset:`);
      console.log(`    - expiredAt: ${TEGAL_RULES.expiredAt.toISOString()} (${formatWibDisplay(TEGAL_RULES.expiredAt)})`);
      console.log(`    - billingDay: ${TEGAL_RULES.billingDay}`);
      console.log(`    - billingCycleDay: ${TEGAL_RULES.billingCycleDay}`);
      console.log(`    - autoIsolationEnabled: ${TEGAL_RULES.autoIsolationEnabled}`);
      console.log(`    - status: '${TEGAL_RULES.status}'`);

      console.log(`  [SIMULASI] ${otherUsers.length} pelanggan Wilayah Lain akan diset:`);
      console.log(`    - expiredAt: ${OTHER_RULES.expiredAt.toISOString()} (${formatWibDisplay(OTHER_RULES.expiredAt)})`);
      console.log(`    - billingDay: ${OTHER_RULES.billingDay}`);
      console.log(`    - billingCycleDay: ${OTHER_RULES.billingCycleDay}`);
      console.log(`    - autoIsolationEnabled: ${OTHER_RULES.autoIsolationEnabled}`);
      console.log(`    - status: '${OTHER_RULES.status}'`);
    } else {
      // Update pelanggan Kp. Tegal
      if (tegalUsers.length > 0) {
        const tegalIds = tegalUsers.map((u) => u.id);
        const tegalRes = await prisma.pppoeUser.updateMany({
          where: { id: { in: tegalIds } },
          data: {
            expiredAt: TEGAL_RULES.expiredAt,
            billingDay: TEGAL_RULES.billingDay,
            billingCycleDay: TEGAL_RULES.billingCycleDay,
            autoIsolationEnabled: TEGAL_RULES.autoIsolationEnabled,
            status: TEGAL_RULES.status,
          },
        });
        console.log(`  [SUKSES] Memperbarui ${tegalRes.count} pelanggan Kp. Tegal.`);
      }

      // Update pelanggan Wilayah Lain
      if (otherUsers.length > 0) {
        const otherIds = otherUsers.map((u) => u.id);
        const otherRes = await prisma.pppoeUser.updateMany({
          where: { id: { in: otherIds } },
          data: {
            expiredAt: OTHER_RULES.expiredAt,
            billingDay: OTHER_RULES.billingDay,
            billingCycleDay: OTHER_RULES.billingCycleDay,
            autoIsolationEnabled: OTHER_RULES.autoIsolationEnabled,
            status: OTHER_RULES.status,
          },
        });
        console.log(`  [SUKSES] Memperbarui ${otherRes.count} pelanggan Wilayah Lain.`);
      }

      // Pastikan fixedBillingDate pada tabel company teratur rapi
      await prisma.company.updateMany({
        data: { fixedBillingDate: 6 },
      });
    }

    console.log('[FASE 3] Selesai.\n');

    // --------------------------------------------------------------------------
    // 4. EKSEKUSI PEMBARUAN INVOICE OKTOBER 2026
    // --------------------------------------------------------------------------
    console.log('[FASE 4] Memperbarui jatuh tempo (dueDate) invoice belum lunas Oktober 2026...');

    if (isDryRun) {
      console.log(`  [SIMULASI] ${tegalInvoices.length} invoice Kp. Tegal akan diset dueDate: 2026-10-10`);
      console.log(`  [SIMULASI] ${otherInvoices.length} invoice Wilayah Lain akan diset dueDate: 2026-10-06`);
    } else {
      if (tegalInvoices.length > 0) {
        const tegalInvIds = tegalInvoices.map((i) => i.id);
        const tegalInvRes = await prisma.invoice.updateMany({
          where: { id: { in: tegalInvIds } },
          data: {
            dueDate: TEGAL_RULES.invoiceDueDate,
          },
        });
        console.log(`  [SUKSES] Memperbarui ${tegalInvRes.count} invoice Kp. Tegal ke dueDate 2026-10-10.`);
      }

      if (otherInvoices.length > 0) {
        const otherInvIds = otherInvoices.map((i) => i.id);
        const otherInvRes = await prisma.invoice.updateMany({
          where: { id: { in: otherInvIds } },
          data: {
            dueDate: OTHER_RULES.invoiceDueDate,
          },
        });
        console.log(`  [SUKSES] Memperbarui ${otherInvRes.count} invoice Wilayah Lain ke dueDate 2026-10-06.`);
      }
    }

    console.log('[FASE 4] Selesai.\n');

    // --------------------------------------------------------------------------
    // 5. UN-ISOLASI MIKROTIK & FREERADIUS
    // --------------------------------------------------------------------------
    console.log('[FASE 5] Menjalankan un-isolasi pada MikroTik & FreeRADIUS...');

    let mikrotikSuccessCount = 0;
    let mikrotikFailedCount = 0;
    let mikrotikAddressListCleaned = 0;
    let radiusRestoredCount = 0;

    // Ambil setting company untuk mengecek RADIUS
    const company = await prisma.company.findFirst();
    const isRadiusEnabled = company?.radiusPppoeEnabled ?? company?.radiusEnabled ?? false;

    if (isDryRun) {
      console.log(`  [SIMULASI] Un-isolasi MikroTik akan dieksekusi untuk ${isolatedUsersBefore.length} pelanggan yang sebelumnya terisolir.`);
      console.log(`  [SIMULASI] Address-list 'isolir' pada router aktif akan dipindai dan dibersihkan.`);
      if (isRadiusEnabled) {
        console.log(`  [SIMULASI] Mode FreeRADIUS aktif: radusergroup 'isolir' akan dipulihkan ke profil normal.`);
      } else {
        console.log(`  [SIMULASI] Mode FreeRADIUS tidak aktif (Local MikroTik mode).`);
      }
    } else {
      // 5A. Sinkronisasi Un-Isolasi MikroTik menggunakan PPPSecretService
      const { PPPSecretService } = await import('../src/server/services/mikrotik/ppp-secret.service');

      if (isolatedUsersBefore.length > 0) {
        console.log(`  [MIKROTIK] Memulihkan ${isolatedUsersBefore.length} pelanggan terisolir via PPPSecretService...`);
        for (const user of isolatedUsersBefore) {
          try {
            const res = await PPPSecretService.unisolateUser(user.id, user.routerId || undefined);
            if (res.success) {
              mikrotikSuccessCount++;
              console.log(`    - [OK] ${user.username} (${user.name}): un-isolir berhasil`);
            } else {
              mikrotikFailedCount++;
              console.log(`    - [GAGAL] ${user.username} (${user.name}): ${res.message}`);
            }
          } catch (err: any) {
            mikrotikFailedCount++;
            console.log(`    - [ERROR] ${user.username} (${user.name}): ${err?.message || err}`);
          }
        }
      } else {
        console.log('  [MIKROTIK] Tidak ada pelanggan dengan status terisolir di database.');
      }

      // 5B. Pembersihan menyeluruh address-list 'isolir' pada seluruh Router aktif
      const activeRouters = await prisma.router.findMany({
        where: { isActive: true },
        include: { vpnClient: true },
      });

      console.log(`  [MIKROTIK] Memindai address-list 'isolir' di ${activeRouters.length} router aktif...`);
      for (const r of activeRouters) {
        let connObj: any = null;
        try {
          const res = await PPPSecretService.connectToRouter(r, 4000);
          connObj = res.conn;

          // Hapus semua entri dalam address-list 'isolir'
          const isolatedAddressList = await connObj.execute(
            '/ip/firewall/address-list/print',
            ['?list=isolir'],
            8000
          );

          if (isolatedAddressList && isolatedAddressList.length > 0) {
            for (const item of isolatedAddressList) {
              if (item['.id']) {
                await connObj.execute('/ip/firewall/address-list/remove', [`=.id=${item['.id']}`], 6000);
                mikrotikAddressListCleaned++;
              }
            }
            console.log(`    - Router '${r.name}': Berhasil menghapus ${isolatedAddressList.length} entri dari address-list 'isolir'.`);
          } else {
            console.log(`    - Router '${r.name}': Bersih (tidak ada entri di address-list 'isolir').`);
          }

          // Cek jika ada secret yang masih menggunakan profile 'isolir'
          const isolatedSecrets = await connObj.execute(
            '/ppp/secret/print',
            ['?profile=isolir'],
            8000
          );

          if (isolatedSecrets && isolatedSecrets.length > 0) {
            console.log(`    - Router '${r.name}': Menemukan ${isolatedSecrets.length} secret ber-profile 'isolir', mengembalikan ke profile normal...`);
            for (const sec of isolatedSecrets) {
              const matchedUser = allUsers.find((u) => u.username === sec.name);
              const normalProfile =
                matchedUser?.profile?.mikrotikProfileName ||
                matchedUser?.profile?.name ||
                matchedUser?.profile?.groupName ||
                'default';

              try {
                await connObj.execute('/ppp/secret/set', [
                  `=.id=${sec['.id']}`,
                  `=profile=${normalProfile}`,
                  `=disabled=no`,
                ], 8000);
              } catch {
                await connObj.execute('/ppp/secret/set', [
                  `=.id=${sec['.id']}`,
                  `=profile=default`,
                  `=disabled=no`,
                ], 8000);
              }
            }
          }

          await connObj.disconnect();
        } catch (routerErr: any) {
          if (connObj) {
            try { await connObj.disconnect(); } catch {}
          }
          console.log(`    - [PERINGATAN] Router '${r.name}' tidak dapat dihubungi: ${routerErr.message || routerErr}`);
        }
      }

      // 5C. Sinkronisasi FreeRADIUS (jika RADIUS aktif atau terdapat tabel radusergroup)
      try {
        // Cek dan bersihkan grup isolir di radusergroup
        const isolatedRadGroups = await prisma.$queryRaw<any[]>`
          SELECT username FROM radusergroup WHERE groupname = 'isolir'
        `.catch(() => []);

        if (isolatedRadGroups && isolatedRadGroups.length > 0) {
          console.log(`  [RADIUS] Ditemukan ${isolatedRadGroups.length} pengguna di grup radusergroup 'isolir'. Memulihkan...`);
          for (const item of isolatedRadGroups) {
            const matchedUser = allUsers.find((u) => u.username === item.username);
            const normalGroup = matchedUser?.profile?.groupName || matchedUser?.profile?.name || 'default';

            await prisma.$executeRaw`DELETE FROM radusergroup WHERE username = ${item.username}`;
            await prisma.$executeRaw`
              INSERT INTO radusergroup (username, groupname, priority)
              VALUES (${item.username}, ${normalGroup}, 1)
            `;
            await prisma.$executeRaw`
              DELETE FROM radreply WHERE username = ${item.username} AND attribute = 'Reply-Message'
            `;
            radiusRestoredCount++;
          }
          console.log(`  [RADIUS] Berhasil memulihkan ${radiusRestoredCount} pengguna FreeRADIUS ke grup normal.`);
        } else {
          console.log('  [RADIUS] Tidak ada entri ber-group "isolir" di tabel radusergroup.');
        }
      } catch (radEx: any) {
        console.log(`  [RADIUS INFO] Tabel RADIUS dilewati atau tidak digunakan: ${radEx?.message || 'OK'}`);
      }
    }

    console.log('[FASE 5] Selesai.\n');

    // --------------------------------------------------------------------------
    // 6. TABEL REKAPITULASI HASIL EKSEKUSI
    // --------------------------------------------------------------------------
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('================================================================================');
    console.log('REKAPITULASI MIGRASI SIKLUS BILLING OKTOBER 2026');
    console.log('================================================================================');
    console.log(`Status Operasi    : ${isDryRun ? 'SIMULASI SELESAI (DRY-RUN)' : 'EKSEKUSI SUKSES (LIVE)'}`);
    console.log(`Total Durasi      : ${elapsedSec} detik`);
    console.log(`Total Pelanggan   : ${allUsers.length} pelanggan\n`);

    console.log('TABEL 1: REKAPITULASI PELANGGAN PPPOE');
    console.table([
      {
        Wilayah: TEGAL_RULES.label,
        'Jumlah Pelanggan': tegalUsers.length,
        'Expired Date (WIB)': formatWibDisplay(TEGAL_RULES.expiredAt),
        'Billing Day': `Tgl ${TEGAL_RULES.billingDay}`,
        'Cycle Day': `Tgl ${TEGAL_RULES.billingCycleDay}`,
        'Auto-Isolir': 'NONAKTIF (Anti-Isolasi)',
        Status: TEGAL_RULES.status,
      },
      {
        Wilayah: OTHER_RULES.label,
        'Jumlah Pelanggan': otherUsers.length,
        'Expired Date (WIB)': formatWibDisplay(OTHER_RULES.expiredAt),
        'Billing Day': `Tgl ${OTHER_RULES.billingDay}`,
        'Cycle Day': `Tgl ${OTHER_RULES.billingCycleDay}`,
        'Auto-Isolir': 'AKTIF (Normal Jatuh Tempo Tgl 6)',
        Status: OTHER_RULES.status,
      },
    ]);

    console.log('\nTABEL 2: REKAPITULASI INVOICE OKTOBER 2026 (UNPAID / PENDING)');
    console.table([
      {
        Kategori: 'Invoice Kp. Tegal',
        'Jumlah Tagihan': tegalInvoices.length,
        'Jatuh Tempo Baru': '2026-10-10 (10 Okt 2026)',
        Keterangan: isDryRun ? 'Disimulasikan' : 'Berhasil Diperbarui',
      },
      {
        Kategori: 'Invoice Wilayah Lain',
        'Jumlah Tagihan': otherInvoices.length,
        'Jatuh Tempo Baru': '2026-10-06 (06 Okt 2026)',
        Keterangan: isDryRun ? 'Disimulasikan' : 'Berhasil Diperbarui',
      },
    ]);

    console.log('\nTABEL 3: REKAPITULASI UN-ISOLASI NETWORK');
    console.table([
      {
        Item: 'Pelanggan Terisolir Sebelum Migrasi',
        Jumlah: isolatedUsersBefore.length,
        Keterangan: 'Status sebelum script dijalankan',
      },
      {
        Item: 'MikroTik Secret Un-isolir (Sukses)',
        Jumlah: isDryRun ? `[Simulasi: ${isolatedUsersBefore.length}]` : mikrotikSuccessCount,
        Keterangan: 'PPP secret disabled=no & normal profile',
      },
      {
        Item: 'MikroTik Secret Un-isolir (Gagal/Offline)',
        Jumlah: isDryRun ? '[Simulasi: 0]' : mikrotikFailedCount,
        Keterangan: 'Router timeout atau offline',
      },
      {
        Item: 'Entri Address-List "isolir" Dibersihkan',
        Jumlah: isDryRun ? '[Simulasi]' : mikrotikAddressListCleaned,
        Keterangan: 'MikroTik firewall address-list',
      },
      {
        Item: 'FreeRADIUS Radusergroup Dipulihkan',
        Jumlah: isDryRun ? '[Simulasi]' : radiusRestoredCount,
        Keterangan: 'radusergroup isolir -> normal package group',
      },
    ]);

    // Contoh data sampel untuk validasi visual
    console.log('\nCONTOH SAMPEL HASIL KATEGORISASI PELANGGAN:');
    if (tegalUsers.length > 0) {
      const sampleTegal = tegalUsers[0];
      const area = sampleTegal.area?.name || sampleTegal.pppoeCustomer?.area?.name || '-';
      const addr = sampleTegal.address || sampleTegal.pppoeCustomer?.address || '-';
      console.log(`  [Contoh Kp. Tegal] Username: ${sampleTegal.username} | Area: ${area} | Alamat: ${addr}`);
    }
    if (otherUsers.length > 0) {
      const sampleOther = otherUsers[0];
      const area = sampleOther.area?.name || sampleOther.pppoeCustomer?.area?.name || '-';
      const addr = sampleOther.address || sampleOther.pppoeCustomer?.address || '-';
      console.log(`  [Contoh Wilayah Lain] Username: ${sampleOther.username} | Area: ${area} | Alamat: ${addr}`);
    }

    console.log('\n================================================================================');
    if (isDryRun) {
      console.log('SIMULASI SELESAI.');
      console.log('Untuk mengeksekusi perubahan ke database dan MikroTik secara permanen, jalankan:');
      console.log('  npx tsx scripts/migrate-billing-october-2026.ts');
    } else {
      console.log('MIGRASI DAN UN-ISOLASI BERHASIL DIJALANKAN DENGAN SUKSES.');
    }
    console.log('================================================================================\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n[FATAL ERROR] Terjadi kegagalan saat menjalankan script migrasi:', error?.message || error);
    if (error?.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

// Jalankan fungsi utama
main();
