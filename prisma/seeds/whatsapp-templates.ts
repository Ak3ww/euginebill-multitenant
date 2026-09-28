import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Complete WhatsApp Templates from Live Production Database (EugineBill_radius)
 * Total: 33 templates with synchronized channel link & application variables.
 */
export const whatsappTemplates = [
  {
    id: 'wa-invoice-created',
    type: 'invoice-created',
    name: 'Notifikasi Invoice Baru',
    message: `📄 *INVOICE PEMBAYARAN INTERNET*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}
• *Paket:* {{profileName}}

⚠️ _Mohon lakukan pembayaran sebelum *{{expiredAt}}* agar layanan internet tetap aktif dan lancar._

-----------------------------------------
*Cara Bayar Instan (Otomatis Lunas):*
1. Klik link: {{paymentLink}}
2. Pilih metode pembayaran (QRIS, VA, atau E-Wallet).

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-voucher-payment-link',
    type: 'voucher-payment-link',
    name: 'Link Pembayaran Voucher (Auto)',
    message: `💳 *LINK PEMBAYARAN VOUCHER*

Yth. Bapak/Ibu *{{customerName}}*
• *No. HP:* {{phone}}
• *Paket:* {{profileName}}

📌 _Satu langkah lagi untuk mengaktifkan voucher Anda. Silakan selesaikan pembayaran melalui tautan berikut:_

-----------------------------------------
*Link Pembayaran:*
{{paymentLink}}

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-maintenance-outage',
    type: 'maintenance-outage',
    name: 'Informasi Gangguan',
    message: `⚠️ *INFORMASI GANGGUAN JARINGAN*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Wilayah:* {{address}}

📢 _Saat ini sedang terjadi gangguan jaringan di wilayah Anda. Tim teknisi kami sedang dalam proses penanganan di lapangan._

📌 _Kami memohon maaf atas ketidaknyamanan ini dan berupaya agar koneksi kembali normal secepatnya._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-maintenance-resolved',
    type: 'maintenance-resolved',
    name: 'Perbaikan Selesai',
    message: `✅ *PERBAIKAN JARINGAN SELESAI*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Paket:* {{profileName}}

🎉 _Penanganan gangguan jaringan telah selesai dilaksanakan. Layanan internet Anda saat ini sudah kembali normal._

📌 _Jika koneksi belum terhubung, mohon coba restart (matikan dan nyalakan kembali) perangkat router Anda selama 1-2 menit._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Masih ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-invoice-overdue',
    type: 'invoice-overdue',
    name: 'Invoice Overdue Reminder',
    message: `⚠️ *PERINGATAN PENANGGUHAN LAYANAN*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}

🚨 _Layanan Anda saat ini diisolir/ditangguhkan sementara karena melewati batas waktu pembayaran._

-----------------------------------------
*Aktifkan Kembali Sekarang (Otomatis Aktif):*
1. Klik link: {{paymentLink}}
2. Selesaikan pembayaran.

_Sistem akan mengaktifkan koneksi Anda secara otomatis dalam 1 detik setelah pembayaran berhasil._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-manual-extension',
    type: 'manual-extension',
    name: 'Perpanjangan Manual',
    message: `🔄 *PERPANJANGAN OTOMATIS BERHASIL*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Paket:* {{profileName}}
• *Masa Aktif Baru:* s/d {{expiredAt}}

🎉 _Paket internet Anda telah berhasil diperpanjang secara otomatis. Terima kasih telah setia memilih {{companyName}}._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-account-info',
    type: 'account-info',
    name: 'Informasi Akun Pelanggan',
    message: `📋 *Informasi Akun*

Halo {{customerName}},

━━━━━━━━━━━━━━━━━━━━━━
*📱 DETAIL AKUN ANDA*
━━━━━━━━━━━━━━━━━━━━━━
🆔 ID Pelanggan: {{customerId}}
👤 Username: {{username}}
📦 Paket: {{profileName}}
📍 Area: {{area}}
📅 Masa Aktif: {{expiredAt}}

📞 {{companyPhone}}
📧 {{companyEmail}}

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-admin-create-user',
    type: 'admin-create-user',
    name: 'Admin Create User',
    message: `🎉 Halo {{customerName}},

Akun internet Anda telah dibuat oleh admin!

━━━━━━━━━━━━━━━━━━━━━━
*🔐 INFO LOGIN*
━━━━━━━━━━━━━━━━━━━━━━
🆔 ID Pelanggan: {{customerId}}
👤 Username: {{username}}
🔑 Password: {{password}}
📦 Paket: {{profileName}}
📍 Area: {{area}}
📅 Aktif hingga: {{expiredDate}}

Silakan gunakan kredensial di atas untuk login ke jaringan kami.

Selamat menikmati layanan internet dari kami! 🌐

{{companyName}}
☎️ {{companyPhone}}`,
    isActive: true,
  },
  {
    id: 'wa-auto-renewal-success',
    type: 'auto-renewal-success',
    name: 'Auto Renewal Berhasil',
    message: `🔄 *PERPANJANGAN OTOMATIS BERHASIL*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Paket:* {{profileName}}
• *Masa Aktif Baru:* s/d {{expiredAt}}

🎉 _Paket internet Anda telah berhasil diperpanjang secara otomatis. Terima kasih telah setia memilih {{companyName}}._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-auto-renewal-warning',
    type: 'auto-renewal-warning',
    name: 'Peringatan Auto Renewal',
    message: `⏰ *Peringatan Auto Renewal*

Halo {{customerName}},

━━━━━━━━━━━━━━━━━━━━━━
*⚠️ INFORMASI PENTING*
━━━━━━━━━━━━━━━━━━━━━━
Saldo deposit Anda *TIDAK CUKUP* untuk auto renewal.

👤 Username: {{username}}
💰 Saldo Saat Ini: Rp {{currentBalance}}
📅 Masa Aktif: {{expiredDate}}

💵 Biaya Renewal: Rp {{renewalAmount}}
⚠️ Kekurangan: Rp {{shortfall}}

━━━━━━━━━━━━━━━━━━━━━━
*📝 LANGKAH SELANJUTNYA*
━━━━━━━━━━━━━━━━━━━━━━
Silakan top-up deposit minimal Rp {{shortfall}} sebelum {{expiredDate}} untuk melanjutkan layanan.

🔗 *Top-up Sekarang:*
{{topupLink}}

📞 Butuh bantuan? Hubungi: {{companyPhone}}

Terima kasih,
_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-general-broadcast',
    type: 'general-broadcast',
    name: 'Broadcast Umum ke Pelanggan',
    message: `📢 *PEMBERITAHUAN DARI {{companyName}}*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}

📌 _[Tuliskan pengumuman atau pesan informasi umum di sini]_

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. Terima kasih, *{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-installation-invoice',
    type: 'installation-invoice',
    name: 'Invoice Instalasi',
    message: `📄 *INVOICE PEMBAYARAN INTERNET*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}
• *Paket:* {{profileName}}

⚠️ _Mohon lakukan pembayaran sebelum *{{expiredAt}}* agar layanan internet tetap aktif dan lancar._

-----------------------------------------
*Cara Bayar Instan (Otomatis Lunas):*
1. Klik link: {{paymentLink}}
2. Pilih metode pembayaran (QRIS, VA, atau E-Wallet).

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-invoice-reminder',
    type: 'invoice-reminder',
    name: 'Pengingat Invoice',
    message: `📄 *INVOICE PEMBAYARAN INTERNET*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}
• *Paket:* {{profileName}}

⚠️ _Mohon lakukan pembayaran sebelum *{{expiredAt}}* agar layanan internet tetap aktif dan lancar._

-----------------------------------------
*Cara Bayar Instan (Otomatis Lunas):*
1. Klik link: {{paymentLink}}
2. Pilih metode pembayaran (QRIS, VA, atau E-Wallet).

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-maintenance-info',
    type: 'maintenance-info',
    name: 'Pemberitahuan Maintenance',
    message: `🔧 *PEMBERITAHUAN PEMELIHARAAN JARINGAN (MAINTENANCE)*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Wilayah:* {{address}}

📢 _Kami menginformasikan bahwa akan dilakukan pemeliharaan sistem/jaringan berkala untuk meningkatkan kualitas layanan internet Anda._

📌 _Selama proses pemeliharaan berlangsung, layanan internet Anda mungkin akan mengalami gangguan singkat. Kami berupaya agar pemeliharaan selesai secepatnya._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-manual_payment_admin',
    type: 'manual_payment_admin',
    name: 'Notifikasi Admin Manual Payment',
    message: `🔔 *NOTIFIKASI PEMBAYARAN MANUAL*

📋 *Detail Pembayaran*
━━━━━━━━━━━━━━━━━━━━
📌 Invoice: {{invoiceNumber}}
👤 Pelanggan: {{customerName}}
🆔 ID: {{customerId}}
💰 Jumlah: {{amount}}

🏦 *Info Transfer*
━━━━━━━━━━━━━━━━━━━━
Bank: {{senderBank}}
Nama: {{senderName}}
No. Rek: {{senderAccount}}

📝 Catatan: {{notes}}

⚠️ Silakan verifikasi dan approve/reject pembayaran ini.

{{companyName}}`,
    isActive: true,
  },
  {
    id: 'wa-manual-payment-approval',
    type: 'manual-payment-approval',
    name: 'Pembayaran Manual Disetujui',
    message: `✅ *PEMBAYARAN BERHASIL & LUNAS*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}
• *Paket:* {{profileName}}

🎉 *Terima kasih!* Pembayaran Anda telah berhasil dikonfirmasi. Layanan internet Anda aktif dan dapat digunakan kembali.

-----------------------------------------
📄 *Unduh Bukti Bayar / Invoice PDF:*
{{invoicePdfLink}}

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-manual-payment-rejection',
    type: 'manual-payment-rejection',
    name: 'Pembayaran Manual Ditolak',
    message: `❌ *PEMBAYARAN MANUAL DITOLAK*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}

 Mohon maaf, bukti transfer pembayaran manual Anda *ditolak* oleh admin.

-----------------------------------------
*Silakan Unggah Ulang Bukti Bayar:*
{{paymentLink}}

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada pertanyaan? Balas chat ini. 
Terima kasih, *{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-outage_notification',
    type: 'outage_notification',
    name: 'Notifikasi Gangguan',
    message: `⚠️ *PEMBERITAHUAN GANGGUAN*

Yth. {{customerName}},

Saat ini terdapat gangguan pada jaringan di area Anda.

Tim teknis kami sedang bekerja untuk mengatasi masalah ini. Kami mohon maaf atas ketidaknyamanannya.

📧 {{companyEmail}}

Terima kasih atas pengertian Anda.

Hormat kami,
*{{companyName}}*`,
    isActive: true,
  },
  {
    id: 'wa-payment_receipt',
    type: 'payment_receipt',
    name: 'Bukti Pembayaran',
    message: `✅ *PEMBAYARAN DIKONFIRMASI*

Halo {{customerName}},

Terima kasih! Pembayaran Anda telah kami konfirmasi.

━━━━━━━━━━━━━━━━━━━━━━
📋 *Detail*
━━━━━━━━━━━━━━━━━━━━━━
📌 Invoice: {{invoiceNumber}}
💰 Jumlah: {{amount}}
✅ Status: LUNAS
📅 Aktif hingga: {{expiredDate}}

Layanan Anda telah diperpanjang.

Terima kasih telah menjadi pelanggan setia kami! 🙏

{{companyName}}
☎️ {{companyPhone}}`,
    isActive: true,
  },
  {
    id: 'wa-payment-confirmed',
    type: 'payment-confirmed',
    name: 'Konfirmasi Pembayaran Diterima',
    message: `✅ *Pembayaran Diterima*

Halo {{customerName}},

Pembayaran Anda untuk invoice *{{invoiceNumber}}* telah kami terima dan konfirmasi.

Layanan Anda sekarang aktif. Terima kasih atas pembayaran tepat waktu!

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-payment-failure',
    type: 'payment-failure',
    name: 'Notifikasi Gagal Bayar',
    message: `❌ *PEMBAYARAN GAGAL*

Halo {{customerName}},

Maaf, pembayaran Anda gagal diproses.

━━━━━━━━━━━━━━━━━━━━━━
📌 Invoice: {{invoiceNumber}}
💰 Jumlah: Rp {{amount}}
❌ Alasan: {{failureReason}}
━━━━━━━━━━━━━━━━━━━━━━

Silakan coba lagi atau hubungi kami.

🔗 {{paymentLink}}
📞 {{companyPhone}}

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-payment-reminder-general',
    type: 'payment-reminder-general',
    name: 'Pengingat Pembayaran Umum',
    message: `📅 *Pengingat Pembayaran*

Halo {{customerName}},

Ini adalah pengingat untuk segera melakukan pembayaran tagihan Anda.

Jangan sampai layanan Anda terganggu. Lakukan pembayaran sebelum jatuh tempo.

{{bankAccounts}}

📞 {{companyPhone}}

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-payment-success',
    type: 'payment-success',
    name: 'Pembayaran Berhasil',
    message: `✅ *PEMBAYARAN BERHASIL & LUNAS*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *No. Invoice:* {{invoiceNumber}}
• *Paket:* {{profileName}}

🎉 *Terima kasih!* Pembayaran Anda telah berhasil dikonfirmasi. Layanan internet Anda aktif dan dapat digunakan kembali.

-----------------------------------------
📄 *Unduh Bukti Bayar / Invoice PDF:*
{{invoicePdfLink}}

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-payment-warning',
    type: 'payment-warning',
    name: 'Peringatan Pembayaran Tertunda',
    message: `⚠️ *PERINGATAN PEMBAYARAN*

Halo {{customerName}},

Pembayaran Anda sudah melewati jatuh tempo.

Segera lakukan pembayaran untuk menghindari pemutusan layanan.

{{bankAccounts}}

📞 {{companyPhone}}

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-promo-offer',
    type: 'promo-offer',
    name: 'Promo & Penawaran Khusus',
    message: `🎁 *PENAWARAN SPESIAL UNTUK ANDA*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Paket Saat Ini:* {{profileName}}

🎉 _[Tuliskan detail promo, diskon perpanjangan, atau penawaran upgrade paket di sini]_

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Tertarik dengan promo ini? Balas chat ini atau hubungi CS kami. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-registration-approval',
    type: 'registration-approval',
    name: 'Persetujuan Pendaftaran',
    message: `🎉 *PENDAFTARAN DISETUJUI*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Paket Layanan:* {{profileName}}

📌 _Selamat! Pendaftaran Anda telah disetujui. Tim teknisi kami akan segera menghubungi Anda untuk koordinasi jadwal pemasangan._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. Terima kasih, *{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-registration-confirmation',
    type: 'registration-confirmation',
    name: 'Konfirmasi Pendaftaran',
    message: `✅ *KONFIRMASI PENDAFTARAN*

Yth. Bapak/Ibu *{{customerName}}*
• *No. HP:* {{phone}}
• *Paket:* {{profileName}}
• *Alamat Pasang:* {{address}}

📌 _Data pendaftaran Anda telah kami terima dan sedang diproses oleh tim. Kami akan menginformasikan kembali untuk jadwal pemasangan di lokasi._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. Terima kasih, *{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-service-suspension',
    type: 'service-suspension',
    name: 'Peringatan Suspend Layanan',
    message: `⚠️ *PERINGATAN SUSPEND*

Halo {{customerName}},

Layanan Anda akan di-suspend karena pembayaran belum dilakukan.

━━━━━━━━━━━━━━━━━━━━━━
👤 Username: {{username}}
📅 Jatuh Tempo: {{dueDate}}
💰 Tagihan: Rp {{amount}}
━━━━━━━━━━━━━━━━━━━━━━

Segera lakukan pembayaran untuk menghindari suspend.

🔗 {{paymentLink}}
📞 {{companyPhone}}

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-thank-you',
    type: 'thank-you',
    name: 'Ucapan Terima Kasih',
    message: `🙏 *Terima Kasih*

Halo {{customerName}},

Terima kasih telah menggunakan layanan *{{companyName}}*. Kepuasan Anda adalah prioritas kami.

Salam hangat,
_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-upgrade-notification',
    type: 'upgrade-notification',
    name: 'Pemberitahuan Upgrade Paket',
    message: `⬆️ *UPGRADE PAKET*

Halo {{customerName}},

Paket internet Anda telah berhasil di-upgrade!

━━━━━━━━━━━━━━━━━━━━━━
📦 Paket Baru: {{newProfileName}}
🚀 Kecepatan: {{speed}}
━━━━━━━━━━━━━━━━━━━━━━

Nikmati internet lebih cepat dan lebih stabil!

_{{companyName}}_`,
    isActive: true,
  },
  {
    id: 'wa-voucher-purchase',
    type: 'voucher-purchase',
    name: 'Pembelian Voucher',
    message: `🎫 *PEMBELIAN VOUCHER BERHASIL*

Yth. Bapak/Ibu *{{customerName}}*
• *No. HP:* {{phone}}
• *Paket:* {{profileName}}

🔑 *KREDENSIAL LOGIN WI-FI:*
• *Username:* {{username}}
• *Password:* {{password}}

-----------------------------------------
*Cara Menggunakan:*
1. Hubungkan ke Wi-Fi *{{companyName}}*.
2. Masukkan Username & Password di atas pada halaman login.

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
    isActive: true,
  },
  {
    id: 'wa-voucher-purchase-success',
    type: 'voucher-purchase-success',
    name: 'E-Voucher Purchase Success',
    message: `🎫 Halo {{customerName}},

Terima kasih telah membeli E-Voucher!

━━━━━━━━━━━━━━━━━━━━━━
*📋 DETAIL PESANAN*
━━━━━━━━━━━━━━━━━━━━━━
🔢 Nomor Order: {{orderNumber}}
📦 Paket: {{profileName}}
🎟️ Jumlah: {{quantity}} voucher
⏱️ Masa Berlaku: {{validity}}

━━━━━━━━━━━━━━━━━━━━━━
*🎟️ KODE VOUCHER ANDA*
━━━━━━━━━━━━━━━━━━━━━━
{{voucherCodes}}

📝 *Cara Pakai:*
1. Hubungkan ke WiFi kami
2. Buka browser
3. Masukkan kode voucher
4. Nikmati internet! 🌐

{{companyName}}
📞 {{companyPhone}}`,
    isActive: true,
  },
  {
    id: 'wa-welcome-message',
    type: 'welcome-message',
    name: 'Selamat Datang Pelanggan Baru',
    message: `🎉 *Selamat Datang!*

Halo {{customerName}},

Selamat bergabung dengan *{{companyName}}*! Kami senang Anda menjadi bagian dari keluarga kami.

Nikmati layanan internet berkualitas dari kami. Tim support kami siap membantu Anda 24/7.

📞 {{companyPhone}}

Terima kasih! 🙏`,
    isActive: true,
  },
];

export async function seedWhatsAppTemplates(force = false, client?: PrismaClient) {
  const db = client || prisma;
  console.log(`🌱 Seeding WhatsApp templates (always updates message content)...`);
  
  for (const template of whatsappTemplates) {
    await db.whatsapp_templates.upsert({
      where: { type: template.type },
      create: template,
      update: { name: template.name, message: template.message, isActive: template.isActive },
    });
    console.log(`   ✅ Template: ${template.name}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const force = process.argv.includes('--force');
  seedWhatsAppTemplates(force)
    .then(() => {
      console.log('✅ WhatsApp templates seeded successfully!');
      prisma.$disconnect();
    })
    .catch((error) => {
      console.error('❌ Error seeding WhatsApp templates:', error);
      prisma.$disconnect();
      process.exit(1);
    });
}
