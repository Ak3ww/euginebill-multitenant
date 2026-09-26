# Dokumentasi Teknis: EugineBill Cloud SaaS Landing Page & 7-Day Trial Platform

## 1. Ringkasan Fitur
EugineBill Cloud SaaS Landing Page (`src/app/saas/page.tsx`) adalah landing page publik untuk penawaran berlangganan Cloud Billing & Network Management ISP / RT-RW Net berbasis multi-tenant dengan uji coba gratis 7 hari tanpa kartu kredit.

Halaman ini dibangun dengan standar **Hallmark Anti-AI-Slop Design** bertema **Oceanic Blue (`#002c60`, `#1b437c`)** dan komponen Shadcn UI. Mengikuti aturan ketat workspace, halaman ini sepenuhnya bebas dari teks emoji dan mengandalkan ikon-ikon resmi `Lucide React`.

---

## 2. Struktur Modul & Komponen UI

### A. Hero Section
- **Announcement Banner**: Menampilkan rilis fitur terbaru v2.40 (TR-069 GenieACS & Dynamic QRIS).
- **Badge**: `Cloud ISP & RT-RW Net Billing Platform v2.40`.
- **Headline**: "Sistem Billing & Network Management ISP / RT-RW Net Berbasis Cloud".
- **Subtitle**: Menguraikan kapabilitas utama (MikroTik tak terbatas, auto isolasi, WhatsApp Bot, FreeRADIUS 3, TR-069, QRIS).
- **Action CTA**: 
  - Primary: "Coba Gratis 7 Hari" (membuka modal pendaftaran interaktif).
  - Secondary: "Buka Live Demo Sandbox" (membuka portal admin).
- **Trust Badges**: 100% Data Terisolasi per Database, 99.99% SLA Cloud Uptime, MikroTik RouterOS v6 & v7 Ready, FreeRADIUS 3.x High-Speed.
- **Interactive Cloud Architecture Card**: Simulasi visual real-time status router, WhatsApp queue, isolasi CoA, dan telemetri ONT.

### B. Feature Highlights Grid (6 Key Modules)
1. **Native MikroTik API & Dynamic Ports**: Remote Winbox, API socket, WebFig via VPN proxy.
2. **FreeRADIUS 3.x High-Performance Engine**: Autentikasi kilat puluhan ribu sesi simultan + auto CoA disconnect.
3. **WhatsApp Bot Billing Otomatis**: Notifikasi H-3, H-1, H+0, lampiran PDF invoice, verifikasi bayar.
4. **Cetak Voucher Hotspot Kilat**: Format thermal 58/80mm dan A4 dengan QR code scan instan.
5. **TR-069 & GenieACS ONT Management**: Auto provisioning ONT ZTE, Huawei, Fiberhome, VSOL & telemetry optical power.
6. **Integrasi Payment Gateway Lengkap**: QRIS, Virtual Account Bank (BCA, Mandiri, BRI, BNI), Alfamart/Indomaret via Duitku, Midtrans, Tripay, Xendit.

### C. Interactive Price List Section
- **Billing Switch**: Toggle Bulanan vs Tahunan (diskon 20%).
- **3 Paket Utama**:
  - **Starter**: Rp 99.000 / bln (1 Router MikroTik, 100 Pelanggan PPPoE, 500 Voucher, WA Bot Notifikasi).
  - **Pro (Paling Populer & Rekomendasi)**: Rp 249.000 / bln (5 Router MikroTik, 1.000 Pelanggan PPPoE, Unlimited Voucher, WA Bot CS, TR-069 GenieACS, Multi-Admin, QRIS Gateway, Telegram Auto Backup).
  - **Enterprise**: Rp 499.000 / bln (Unlimited Router, Unlimited Pelanggan, Dedicated VPN Server, Custom Domain Branding, 24/7 SLA Priority Support).

### D. Interactive "Coba Gratis 7 Hari" Modal
- **Form Fields**:
  - Nama ISP / Perusahaan
  - Pilihan Subdomain (`[citranet] .euginebill.com`) dengan validasi instan debounce ke `/api/saas/check-subdomain`
  - Email Penanggung Jawab
  - Nomor WhatsApp
  - Password SuperAdmin (dengan toggle show/hide)
- **Live Provisioning Stepper**:
  - Animasi progres interaktif 5 langkah ("Memvalidasi data...", "Menyiapkan cluster database terisolasi...", "Menginisialisasi skema billing...", "Mengonfigurasi bot & gateway...", "Siap! Mengalihkan ke Halaman Setup...").
  - Auto redirect ke `/setup?tenant=<slug>&trial=true&plan=<plan>`.

### E. Security Badges & FAQ
- 4 Pilar Keamanan: 100% Data Isolation, 99.99% SLA Uptime, Enkripsi Bank-Grade, Auto Cloud Backup.
- Accordion FAQ interaktif untuk menjawab pertanyaan teknis seputar VPN MikroTik, WhatsApp Bot, dan keamanan database.

---

## 3. Kontrak API Backend

### 1. Check Subdomain Availability (`GET /api/saas/check-subdomain?slug=<slug>`)
- **Query Param**: `slug` (string, 3-30 karakter)
- **Response**:
```json
{
  "available": true,
  "slug": "citranet",
  "message": "Subdomain citranet.euginebill.com tersedia!"
}
```

### 2. Tenant SaaS Registration (`POST /api/saas/register`)
- **Payload**:
```json
{
  "companyName": "PT Citra Solusi Internet",
  "subdomain": "citranet",
  "email": "admin@citranet.id",
  "phone": "081234567890",
  "password": "PasswordAman123!",
  "plan": "pro",
  "billingCycle": "yearly"
}
```
- **Response 201 Created**:
```json
{
  "success": true,
  "message": "Akun trial 7 hari berhasil didaftarkan! Database terisolasi sedang disiapkan.",
  "data": {
    "tenantSlug": "citranet",
    "companyName": "PT Citra Solusi Internet",
    "adminEmail": "admin@citranet.id",
    "adminPhone": "081234567890",
    "plan": "pro",
    "billingCycle": "yearly",
    "trialDays": 7,
    "redirectUrl": "/setup?tenant=citranet&trial=true&plan=pro"
  }
}
```
