import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedIsolationTemplates(client?: PrismaClient) {
  const db = client || prisma;
  console.log('🌱 Seeding isolation templates (from live production database)...');

  // WhatsApp Template
  await db.isolationTemplate.upsert({
    where: { id: 'isolation-wa-default' },
    update: {
      name: 'Default WhatsApp Isolation Notice',
      message: `⚠️ *PERINGATAN PENANGGUHAN LAYANAN*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Masa Aktif Habis:* {{expiredDate}}

🚨 _Akses internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan._

-----------------------------------------
*Aktifkan Kembali Sekarang (Otomatis Aktif):*
1. Selesaikan pembayaran melalui link: {{paymentLink}}
2. Lakukan restart / reconnect router Anda.

_Sistem akan mengaktifkan koneksi Anda secara otomatis setelah pembayaran berhasil._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
      variables: {
        customerName: 'Nama pelanggan',
        customerId: 'ID Pelanggan',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        link_download_aplikasi: 'Link download aplikasi Android/PWA',
        companyName: 'Nama ISP / Perusahaan',
      },
      isActive: true,
    },
    create: {
      id: 'isolation-wa-default',
      type: 'whatsapp',
      name: 'Default WhatsApp Isolation Notice',
      message: `⚠️ *PERINGATAN PENANGGUHAN LAYANAN*

Yth. Bapak/Ibu *{{customerName}}*
• *ID Pelanggan:* {{customerId}}
• *Masa Aktif Habis:* {{expiredDate}}

🚨 _Akses internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan._

-----------------------------------------
*Aktifkan Kembali Sekarang (Otomatis Aktif):*
1. Selesaikan pembayaran melalui link: {{paymentLink}}
2. Lakukan restart / reconnect router Anda.

_Sistem akan mengaktifkan koneksi Anda secara otomatis setelah pembayaran berhasil._

-----------------------------------------
📱 *Aplikasi Pelanggan:* {{link_download_aplikasi}}
📢 *WA Channel Info & Promo:* https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v

Ada kendala? Balas chat ini. 
Terima kasih, 
*{{companyName}}*.`,
      variables: {
        customerName: 'Nama pelanggan',
        customerId: 'ID Pelanggan',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        link_download_aplikasi: 'Link download aplikasi Android/PWA',
        companyName: 'Nama ISP / Perusahaan',
      },
      isActive: true,
    },
  });

  // Email Template
  await db.isolationTemplate.upsert({
    where: { id: 'isolation-email-default' },
    update: {
      name: 'Default Email Isolation Notice',
      subject: '⚠️ Akun Anda Telah Diisolir - {{username}}',
      message: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #222222; background-color: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e4e4e7; }
    .header { background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 21px; }
    .header p { margin: 5px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 28px; }
    .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; padding: 14px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; }
    .info-box { background: #fafafa; padding: 15px; border: 1px solid #e4e4e7; border-radius: 6px; margin: 20px 0; }
    .button-container { text-align: center; margin: 25px 0; }
    .button { display: inline-block; background: #b91c1c; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }
    .qr-code { text-align: center; margin: 25px 0; padding: 15px; background: #fafafa; border: 1px dashed #d4d4d8; border-radius: 6px; }
    .footer { background: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
    .footer a { color: #b91c1c; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ PERINGATAN PENANGGUHAN LAYANAN</h1>
      <p>Akses Internet Dibatasi Sementara</p>
    </div>
    
    <div class="content">
      <p>Yth. Bapak/Ibu <strong>{{customerName}}</strong>,</p>
      
      <div class="alert-box">
        <strong>Pemberitahuan Penangguhan:</strong><br>
        Layanan internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan pada <strong>{{expiredDate}}</strong>.
      </div>
      
      <div class="info-box">
        <table width="100%" cellpadding="6" style="border-collapse: collapse;">
          <tr>
            <td width="140" style="color: #52525b;"><strong>ID Pelanggan</strong></td>
            <td>: {{username}}</td>
          </tr>
          <tr>
            <td style="color: #52525b;"><strong>Masa Aktif Habis</strong></td>
            <td>: {{expiredDate}}</td>
          </tr>
        </table>
      </div>
      
      <h3>💡 Aktifkan Kembali Sekarang (Otomatis Aktif):</h3>
      <ol style="padding-left: 20px;">
        <li>Selesaikan pembayaran melalui tombol di bawah atau scan QR Code.</li>
        <li>Lakukan restart / reconnect router Anda.</li>
        <li>Koneksi internet Anda akan aktif kembali secara otomatis.</li>
      </ol>
      
      <div class="button-container">
        <a href="{{paymentLink}}" class="button">💳 Bayar Sekarang</a>
      </div>
      
      <div class="qr-code">
        <p style="margin-top: 0; font-weight: bold;">Atau Scan QR Code Pembayaran:</p>
        <img src="{{qrCodeImage}}" alt="QR Code Pembayaran" width="180" height="180" style="display: block; margin: 0 auto;">
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e4e4e7; font-size: 14px;">
        <strong>Ada kendala? Hubungi Customer Service Kami:</strong><br>
        📱 WhatsApp: {{companyPhone}}<br>
        📧 Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="footer">
      <p style="margin-bottom: 8px;">
        📱 <a href="{{link_download_aplikasi}}">Aplikasi Pelanggan</a> | 
        📢 <a href="https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v">WA Channel Info & Promo</a>
      </p>
      <p style="margin: 5px 0;">Salam hangat, <strong>{{companyName}}</strong></p>
    </div>
  </div>
</body>
</html>`,
      variables: {
        customerName: 'Nama pelanggan',
        username: 'Username PPPoE',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        qrCodeImage: 'URL QR Code Image',
        companyPhone: 'Nomor WhatsApp CS',
        companyEmail: 'Email Perusahaan',
        companyName: 'Nama ISP / Perusahaan',
        link_download_aplikasi: 'Link download aplikasi Android/PWA',
      },
      isActive: true,
    },
    create: {
      id: 'isolation-email-default',
      type: 'email',
      name: 'Default Email Isolation Notice',
      subject: '⚠️ PERINGATAN PENANGGUHAN LAYANAN - {{username}}',
      message: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #222222; background-color: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e4e4e7; }
    .header { background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 21px; }
    .header p { margin: 5px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 28px; }
    .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; padding: 14px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; }
    .info-box { background: #fafafa; padding: 15px; border: 1px solid #e4e4e7; border-radius: 6px; margin: 20px 0; }
    .button-container { text-align: center; margin: 25px 0; }
    .button { display: inline-block; background: #b91c1c; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }
    .qr-code { text-align: center; margin: 25px 0; padding: 15px; background: #fafafa; border: 1px dashed #d4d4d8; border-radius: 6px; }
    .footer { background: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
    .footer a { color: #b91c1c; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ PERINGATAN PENANGGUHAN LAYANAN</h1>
      <p>Akses Internet Dibatasi Sementara</p>
    </div>
    
    <div class="content">
      <p>Yth. Bapak/Ibu <strong>{{customerName}}</strong>,</p>
      
      <div class="alert-box">
        <strong>Pemberitahuan Penangguhan:</strong><br>
        Layanan internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan pada <strong>{{expiredDate}}</strong>.
      </div>
      
      <div class="info-box">
        <table width="100%" cellpadding="6" style="border-collapse: collapse;">
          <tr>
            <td width="140" style="color: #52525b;"><strong>ID Pelanggan</strong></td>
            <td>: {{username}}</td>
          </tr>
          <tr>
            <td style="color: #52525b;"><strong>Masa Aktif Habis</strong></td>
            <td>: {{expiredDate}}</td>
          </tr>
        </table>
      </div>
      
      <h3>💡 Aktifkan Kembali Sekarang (Otomatis Aktif):</h3>
      <ol style="padding-left: 20px;">
        <li>Selesaikan pembayaran melalui tombol di bawah atau scan QR Code.</li>
        <li>Lakukan restart / reconnect router Anda.</li>
        <li>Koneksi internet Anda akan aktif kembali secara otomatis.</li>
      </ol>
      
      <div class="button-container">
        <a href="{{paymentLink}}" class="button">💳 Bayar Sekarang</a>
      </div>
      
      <div class="qr-code">
        <p style="margin-top: 0; font-weight: bold;">Atau Scan QR Code Pembayaran:</p>
        <img src="{{qrCodeImage}}" alt="QR Code Pembayaran" width="180" height="180" style="display: block; margin: 0 auto;">
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e4e4e7; font-size: 14px;">
        <strong>Ada kendala? Hubungi Customer Service Kami:</strong><br>
        📱 WhatsApp: {{companyPhone}}<br>
        📧 Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="footer">
      <p style="margin-bottom: 8px;">
        📱 <a href="{{link_download_aplikasi}}">Aplikasi Pelanggan</a> | 
        📢 <a href="https://whatsapp.com/channel/0029Vb80GhZ1CYoX3FVC4m2v">WA Channel Info & Promo</a>
      </p>
      <p style="margin: 5px 0;">Salam hangat, <strong>{{companyName}}</strong></p>
    </div>
  </div>
</body>
</html>`,
      variables: {
        customerName: 'Nama pelanggan',
        username: 'Username PPPoE',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        qrCodeImage: 'URL QR Code Image',
        companyPhone: 'Nomor WhatsApp CS',
        companyEmail: 'Email Perusahaan',
        companyName: 'Nama ISP / Perusahaan',
        link_download_aplikasi: 'Link download aplikasi Android/PWA',
      },
      isActive: true,
    },
  });

  // HTML Landing Page Template
  await db.isolationTemplate.upsert({
    where: { id: 'isolation-html-default' },
    update: {
      name: 'Default HTML Landing Page',
      message: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peringatan Penangguhan Layanan - {{companyName}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #222222; 
      background-color: #f4f4f5; 
      margin: 0; 
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      width: 100%;
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff; 
      border-radius: 8px; 
      overflow: hidden; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
      border: 1px solid #e4e4e7; 
    }
    .header { 
      background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); 
      color: white; 
      padding: 25px; 
      text-align: center; 
    }
    .header h1 { margin: 0; font-size: 21px; }
    .header p { margin: 5px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 28px; }
    .alert-box { 
      background: #fef2f2; 
      border-left: 4px solid #ef4444; 
      color: #991b1b; 
      padding: 14px; 
      margin-bottom: 20px; 
      border-radius: 4px; 
      font-size: 14px; 
    }
    .info-box { 
      background: #fafafa; 
      padding: 15px; 
      border: 1px solid #e4e4e7; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .button-container { text-align: center; margin: 25px 0; }
    .button { 
      display: inline-block; 
      background: #b91c1c; 
      color: #ffffff !important; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold; 
      text-align: center; 
    }
    .button:hover { background: #991b1b; }
    .qr-code { 
      text-align: center; 
      margin: 25px 0; 
      padding: 15px; 
      background: #fafafa; 
      border: 1px dashed #d4d4d8; 
      border-radius: 6px; 
    }
    .footer { 
      background: #f4f4f5; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #71717a; 
      border-top: 1px solid #e4e4e7; 
    }
    
    @media (max-width: 480px) {
      .content { padding: 20px; }
      .header h1 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ PERINGATAN PENANGGUHAN LAYANAN</h1>
      <p>Akses Internet Dibatasi Sementara</p>
    </div>
    
    <div class="content">
      <p>Yth. Bapak/Ibu <strong>{{customerName}}</strong>,</p>
      
      <div class="alert-box">
        <strong>Pemberitahuan Penangguhan:</strong><br>
        Layanan internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan pada <strong>{{expiredDate}}</strong>.
      </div>
      
      <div class="info-box">
        <table width="100%" cellpadding="6" style="border-collapse: collapse;">
          <tr>
            <td width="140" style="color: #52525b;"><strong>ID Pelanggan</strong></td>
            <td>: {{username}}</td>
          </tr>
          <tr>
            <td style="color: #52525b;"><strong>Masa Aktif Habis</strong></td>
            <td>: {{expiredDate}}</td>
          </tr>
        </table>
      </div>
      
      <h3>💡 Aktifkan Kembali Sekarang (Otomatis Aktif):</h3>
      <ol style="padding-left: 20px;">
        <li>Selesaikan pembayaran melalui tombol di bawah atau scan QR Code.</li>
        <li>Lakukan restart / reconnect router Anda.</li>
        <li>Koneksi internet Anda akan aktif kembali secara otomatis.</li>
      </ol>
      
      <div class="button-container">
        <a href="{{paymentLink}}" class="button">💳 Bayar Sekarang</a>
      </div>
      
      <div class="qr-code">
        <p style="margin-top: 0; font-weight: bold;">Atau Scan QR Code Pembayaran:</p>
        <img src="{{qrCodeImage}}" alt="QR Code Pembayaran" width="180" height="180" style="display: block; margin: 0 auto;">
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e4e4e7; font-size: 14px;">
        <strong>Ada kendala? Hubungi Customer Service Kami:</strong><br>
        📱 WhatsApp: {{companyPhone}}<br>
        📧 Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="footer">
      <p>Copyright &copy; 2026 <strong>{{companyName}}</strong>. All Rights Reserved.</p>
    </div>
  </div>

  <script>
    // Refresh halaman otomatis setiap 5 menit (300.000 ms)
    setTimeout(function() { location.reload(); }, 300000);
  </script>
</body>
</html>`,
      variables: {
        customerName: 'Nama pelanggan',
        username: 'Username PPPoE',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        qrCodeImage: 'URL QR Code Image',
        companyPhone: 'Nomor WhatsApp CS',
        companyEmail: 'Email Perusahaan',
        companyName: 'Nama ISP / Perusahaan',
      },
      isActive: true,
    },
    create: {
      id: 'isolation-html-default',
      type: 'html_page',
      name: 'Default HTML Landing Page',
      message: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peringatan Penangguhan Layanan - {{companyName}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #222222; 
      background-color: #f4f4f5; 
      margin: 0; 
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      width: 100%;
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff; 
      border-radius: 8px; 
      overflow: hidden; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
      border: 1px solid #e4e4e7; 
    }
    .header { 
      background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); 
      color: white; 
      padding: 25px; 
      text-align: center; 
    }
    .header h1 { margin: 0; font-size: 21px; }
    .header p { margin: 5px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 28px; }
    .alert-box { 
      background: #fef2f2; 
      border-left: 4px solid #ef4444; 
      color: #991b1b; 
      padding: 14px; 
      margin-bottom: 20px; 
      border-radius: 4px; 
      font-size: 14px; 
    }
    .info-box { 
      background: #fafafa; 
      padding: 15px; 
      border: 1px solid #e4e4e7; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .button-container { text-align: center; margin: 25px 0; }
    .button { 
      display: inline-block; 
      background: #b91c1c; 
      color: #ffffff !important; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold; 
      text-align: center; 
    }
    .button:hover { background: #991b1b; }
    .qr-code { 
      text-align: center; 
      margin: 25px 0; 
      padding: 15px; 
      background: #fafafa; 
      border: 1px dashed #d4d4d8; 
      border-radius: 6px; 
    }
    .footer { 
      background: #f4f4f5; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #71717a; 
      border-top: 1px solid #e4e4e7; 
    }
    
    @media (max-width: 480px) {
      .content { padding: 20px; }
      .header h1 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ PERINGATAN PENANGGUHAN LAYANAN</h1>
      <p>Akses Internet Dibatasi Sementara</p>
    </div>
    
    <div class="content">
      <p>Yth. Bapak/Ibu <strong>{{customerName}}</strong>,</p>
      
      <div class="alert-box">
        <strong>Pemberitahuan Penangguhan:</strong><br>
        Layanan internet Anda saat ini diisolir/ditangguhkan sementara karena telah melewati batas masa berlangganan pada <strong>{{expiredDate}}</strong>.
      </div>
      
      <div class="info-box">
        <table width="100%" cellpadding="6" style="border-collapse: collapse;">
          <tr>
            <td width="140" style="color: #52525b;"><strong>ID Pelanggan</strong></td>
            <td>: {{username}}</td>
          </tr>
          <tr>
            <td style="color: #52525b;"><strong>Masa Aktif Habis</strong></td>
            <td>: {{expiredDate}}</td>
          </tr>
        </table>
      </div>
      
      <h3>💡 Aktifkan Kembali Sekarang (Otomatis Aktif):</h3>
      <ol style="padding-left: 20px;">
        <li>Selesaikan pembayaran melalui tombol di bawah atau scan QR Code.</li>
        <li>Lakukan restart / reconnect router Anda.</li>
        <li>Koneksi internet Anda akan aktif kembali secara otomatis.</li>
      </ol>
      
      <div class="button-container">
        <a href="{{paymentLink}}" class="button">💳 Bayar Sekarang</a>
      </div>
      
      <div class="qr-code">
        <p style="margin-top: 0; font-weight: bold;">Atau Scan QR Code Pembayaran:</p>
        <img src="{{qrCodeImage}}" alt="QR Code Pembayaran" width="180" height="180" style="display: block; margin: 0 auto;">
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e4e4e7; font-size: 14px;">
        <strong>Ada kendala? Hubungi Customer Service Kami:</strong><br>
        📱 WhatsApp: {{companyPhone}}<br>
        📧 Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="footer">
      <p>Copyright &copy; 2026 <strong>{{companyName}}</strong>. All Rights Reserved.</p>
    </div>
  </div>

  <script>
    // Refresh halaman otomatis setiap 5 menit (300.000 ms)
    setTimeout(function() { location.reload(); }, 300000);
  </script>
</body>
</html>`,
      variables: {
        customerName: 'Nama pelanggan',
        username: 'Username PPPoE',
        expiredDate: 'Tanggal expired',
        paymentLink: 'Link pembayaran tagihan',
        qrCodeImage: 'URL QR Code Image',
        companyPhone: 'Nomor WhatsApp CS',
        companyEmail: 'Email Perusahaan',
        companyName: 'Nama ISP / Perusahaan',
      },
      isActive: true,
    },
  });

  // Update company to use default templates
  await db.company.updateMany({
    where: {
      OR: [
        { isolationWhatsappTemplateId: null },
        { isolationEmailTemplateId: null },
        { isolationHtmlTemplateId: null },
      ],
    },
    data: {
      isolationWhatsappTemplateId: 'isolation-wa-default',
      isolationEmailTemplateId: 'isolation-email-default',
      isolationHtmlTemplateId: 'isolation-html-default',
    },
  });

  console.log('✅ Isolation templates seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedIsolationTemplates()
    .catch((e) => {
      console.error('❌ Error seeding isolation templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
