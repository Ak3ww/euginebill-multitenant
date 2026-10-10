// Bypass Next.js 'server-only' package when run via standalone tsx / node
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch (_) {}

import 'dotenv/config';
import { prisma } from '../src/server/db/client';

async function main() {
  console.log('================================================================');
  console.log('🔍 DIAGNOSIS: PENGATURAN & STATUS NOTIFIKASI ISOLIR WHATSAPP');
  console.log('================================================================');

  // 1. Cek Pengaturan WhatsApp Reminder Settings
  const settings = await prisma.whatsapp_reminder_settings.findFirst();
  console.log('\n[1] PENGATURAN WHATSAPP REMINDER (Tabel: whatsapp_reminder_settings):');
  if (!settings) {
    console.log('❌ Belum ada record di tabel whatsapp_reminder_settings (menggunakan default sistem)');
  } else {
    console.log(`- Enabled                    : ${settings.enabled}`);
    console.log(`- Jeda Hari Isolir (H+X)     : ${settings.isolationDelayDays} hari (Target: H+${settings.isolationDelayDays})`);
    console.log(`- Jadwal Pengingat Invoice   : ${settings.reminderDays}`);
    console.log(`- Jam Pengiriman             : ${settings.reminderTime} WIB`);
    console.log(`- Batch Size & Delay         : ${settings.batchSize} pesan per batch, jeda ${settings.batchDelay} detik`);
    console.log(`- Terakhir Diperbarui        : ${settings.updatedAt ? new Date(settings.updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}`);
  }

  // 2. Cek Pengaturan Company
  const company = await prisma.company.findFirst();
  console.log('\n[2] PENGATURAN PERUSAHAAN (Tabel: company):');
  console.log(`- Nama Perusahaan            : ${company?.name || '-'}`);
  console.log(`- Fitur Isolasi Aktif        : ${company?.isolationEnabled ?? true}`);
  console.log(`- Kirim Notif Isolir via WA  : ${company?.isolationNotifyWhatsapp ?? true}`);
  console.log(`- Grace Period (Masa Tenggang: ${company?.gracePeriodDays ?? 0} hari`);

  // 3. Cek Pengguna yang Berstatus ISOLATED
  const isolatedUsers = await prisma.pppoeUser.findMany({
    where: {
      status: 'isolated',
    },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      status: true,
      expiredAt: true,
      waNotificationEnabled: true,
      autoIsolationEnabled: true,
      billingDay: true,
    },
    orderBy: { expiredAt: 'asc' },
  });

  const targetDelay = settings?.isolationDelayDays ?? 7;
  console.log(`\n[3] DAFTAR PELANGGAN STATUS 'ISOLATED' (${isolatedUsers.length} Orang):`);

  if (isolatedUsers.length === 0) {
    console.log('ℹ️ Tidak ada pelanggan berstatus "isolated" saat ini.');
  } else {
    const now = new Date();
    for (const u of isolatedUsers) {
      const expDate = u.expiredAt ? new Date(u.expiredAt) : null;
      let daysSinceExact = 0;
      let calendarDaysSince = 0;

      if (expDate) {
        const expEnd = new Date(expDate);
        expEnd.setUTCHours(23, 59, 59, 999);
        const msSince = now.getTime() - expEnd.getTime();
        daysSinceExact = msSince / (24 * 60 * 60 * 1000);

        // Hitung selisih kalender sederhana
        const diffTime = now.getTime() - expDate.getTime();
        calendarDaysSince = Math.floor(diffTime / (24 * 60 * 60 * 1000));
      }

      // Cek apakah sudah pernah menerima pesan isolasi di whatsapp_history
      const cycleStart = expDate ? new Date(expDate.getTime() - 5 * 24 * 60 * 60 * 1000) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const rawPhone = (u.phone || '').trim();
      const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
      const phone62 = digitsOnly.startsWith('0') ? `62${digitsOnly.slice(1)}` : digitsOnly;
      const phoneCandidates = Array.from(new Set([rawPhone, digitsOnly, phone62, `+${phone62}`])).filter(Boolean);

      const recentMessages = await prisma.whatsapp_history.findMany({
        where: {
          sentAt: { gte: cycleStart },
          OR: [
            { phone: { in: phoneCandidates } },
            ...(u.username ? [{ message: { contains: u.username } }] : []),
          ],
        },
        orderBy: { sentAt: 'desc' },
        take: 10,
      });

      const isIsolationMessage = (msg: string) => {
        const lower = (msg || '').toLowerCase();
        return (
          lower.includes('isolir') ||
          lower.includes('diisolir') ||
          lower.includes('terisolir') ||
          lower.includes('dibatasi') ||
          lower.includes('habis') ||
          lower.includes('akses internet dibatasi')
        );
      };

      const existingIsoWa = recentMessages.find(m => m.status !== 'failed' && isIsolationMessage(m.message));

      let statusDiagnosa = '';
      if (!u.phone) {
        statusDiagnosa = '❌ Tidak ada no HP';
      } else if (existingIsoWa) {
        statusDiagnosa = `✅ SUDAH TERKIRIM pada ${new Date(existingIsoWa.sentAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
      } else if (daysSinceExact < targetDelay && calendarDaysSince < targetDelay) {
        statusDiagnosa = `⏳ DEFERRED (Baru H+${Math.max(0, calendarDaysSince)}, butuh H+${targetDelay})`;
      } else {
        statusDiagnosa = `🚀 SIAP DIKIRIM (Sudah H+${calendarDaysSince} >= H+${targetDelay})`;
      }

      console.log(`----------------------------------------------------------------`);
      console.log(`Username     : ${u.username} (${u.name || '-'})`);
      console.log(`No HP        : ${u.phone || 'KOSONG'}`);
      console.log(`ExpiredAt    : ${expDate ? expDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}`);
      console.log(`Hitungan H+X : Kalender: H+${calendarDaysSince} | Rumus ms: ${daysSinceExact.toFixed(2)} hari`);
      console.log(`Status Notif : ${statusDiagnosa}`);
    }
  }

  // 4. Jika argumen --send diberikan, langsung jalankan pengiriman!
  if (process.argv.includes('--send') || process.argv.includes('--force-send')) {
    console.log('\n================================================================');
    console.log('🚀 MENJALANKAN sendPendingIsolationNotifications()...');
    console.log('================================================================');
    const { sendPendingIsolationNotifications } = require('../src/server/jobs/auto-isolation');
    const res = await sendPendingIsolationNotifications();
    console.log('Hasil Pengiriman:', res);
  } else {
    console.log('\n💡 TIPS: Untuk langsung memicu pengiriman notifikasi isolir sekarang, jalankan:');
    console.log('node --require ./src/cron/preload.cjs --require tsx/cjs ./scripts/diagnose-isolation-settings.ts --send');
  }

  console.log('\n================================================================');
}

main()
  .catch((e) => {
    console.error('Fatal error in diagnosis:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
