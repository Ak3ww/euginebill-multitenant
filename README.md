# EugineBill RADIUS - Billing & Network Management System for ISP / RT-RW Net

<p align="left">
  <a href="https://github.com/Ak3ww/euginebillv2/releases"><img src="https://img.shields.io/badge/version-v2.39.1-002C60.svg?style=flat-square&logo=git" alt="Version"></a>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16.x-black.svg?style=flat-square&logo=next.js" alt="Next.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square&logo=typescript" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-%3E%3D20.x%20LTS-339933.svg?style=flat-square&logo=nodedotjs" alt="Node.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/Database-MySQL%208.0%20%2B%20Prisma-4479A1.svg?style=flat-square&logo=mysql" alt="MySQL"></a>
  <a href="#"><img src="https://img.shields.io/badge/FreeRADIUS-3.x-C0392B.svg?style=flat-square" alt="FreeRADIUS"></a>
  <a href="#"><img src="https://img.shields.io/badge/VPN-WireGuard%20%2B%20L2TP-88171A.svg?style=flat-square&logo=wireguard" alt="VPN"></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License"></a>
</p>

Modern, full-stack billing & RADIUS management system for ISP/RT-RW Net with FreeRADIUS integration, MikroTik Local Auth Mode, Built-in WireGuard & L2TP VPN Server, ONT Remote Proxy, Native WhatsApp Baileys Bot, and Multi-Portal PWA.

> **Latest Release:** v2.39.1 — Commercial Turnkey Release (Ready to Rent / Sell as Managed Single-Tenant VPS) dengan 1-Command All-in-One Installer, First-Time Setup Wizard (`/setup`), Local & RADIUS Per-Router Auth, Auto-Show Transfer Manual, dan Bundled WireGuard + L2TP VPN.

## Quick Start & Easy Setup

> **Butuh panduan instalasi kilat 1-klik & integrasi MikroTik siap pakai?**
> Baca panduan lengkap: **[docs/setup/EUGINEBILL_EASY_SETUP_GUIDE.md](docs/setup/EUGINEBILL_EASY_SETUP_GUIDE.md)**
> - **VPS Setup**: 1 baris perintah curl installer + Setup Wizard (`/setup`).
> - **MikroTik Setup**: Cuma beberapa klik di UI dan paste script di WinBox, router langsung online, siap PPPoE/Hotspot, remote ONT, dan TR-069!

---

## AI Development Assistant & Architecture Memory

**READ FIRST:** [docs/AI_PROJECT_MEMORY.md](docs/AI_PROJECT_MEMORY.md) & [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md) — dokumentasi lengkap arsitektur, spesifikasi database, 70+ panduan teknis, dan troubleshooting playbook.

---

## Core Capabilities & Features

| Kategori | Fitur & Arsitektur Utama |
| :--- | :--- |
| **RADIUS & Local Auth** | Mode fleksibel per-router (`local` MikroTik secrets atau `radius` FreeRADIUS 3.x), real-time CoA disconnect/speed change (Port 3799/UDP), OpenSSL MD4 legacy provider untuk MS-CHAPv2 PPPoE, Dynamic NAS management via `clients.d/`. |
| **VPN Server Management** | WireGuard Server bawaan VPS (`10.200.0.0/24` port 51820 UDP untuk RouterOS v7) & L2TP/IPSec Server (`10.201.0.0/24` untuk RouterOS v6). MikroTik terhubung langsung ke VPS tanpa memerlukan CHR forwarder perantara. |
| **ONT Remote Proxy** | Reverse proxy remote modem pelanggan (`24000:24999/tcp`) via `socat` VPS dan dynamic NAT MikroTik. Akses langsung modem ONT pelanggan di balik IP private tanpa IP publik statis di sisi pelanggan. |
| **Remote Winbox Forwarding**| Forwarding port manajemen router MikroTik (`10001:10999/tcp`) untuk akses Winbox, WebFig, dan API dari mana saja via internet. |
| **PPPoE Management** | Akun pelanggan, paket profile bandwidth, isolir otomatis, penugasan IP statis/pool, auto-sync MikroTik, foto KTP + instalasi via kamera smartphone, GPS otomatis, pemantauan status online/offline 10s. |
| **Hotspot & Voucher** | 8 format kode voucher, generate batch hingga 25.000 voucher, distribusi agen/reseller, auto-sync RADIUS & MikroTik local mode, template cetak profesional dengan barcode QR. |
| **Billing & Invoices** | Penagihan prabayar & pascabayar, invoice PDF & Excel server-side engine (Oceanic Blue), auto-generate tagihan bulanan, sistem saldo deposit agen & pelanggan, auto-renewal otomatis dari saldo. |
| **Payment Gateway & Manual**| Multi-gateway otomatis (Midtrans, Xendit, Tripay, Duitku, QRIN) + Auto-Show Transfer Bank Manual pada `/pay/[token]` dengan 1-klik salin rekening dan upload bukti transfer. |
| **WhatsApp Bot (Baileys Native)**| Bot WhatsApp bawaan VPS via `@whiskeysockets/baileys` (internal port 4000, zero third-party cost, multi-device, auto-reconnect, scan QR langsung di Web Admin). Mendukung juga Fonnte, Wablas, dan Kirimi.id. |
| **Network (FTTH) & OLT** | Manajemen hierarki OLT/ODC/ODP, pemetaan port pelanggan, peta topologi jaringan, kalkulasi jarak kabel fiber optik, visualisasi map interaktif. |
| **Built-in ACS / TR-069** | Native CWMP TR-069 server & GenieACS integration: konfigurasi WiFi multi-vendor (ZTE, Huawei, FiberHome), RxPower optik, reboot jarak jauh, auto-inform. |
| **Isolasi Pelanggan Otomatis** | Auto-isolir pelanggan jatuh tempo, landing page isolir khusus pelanggan (`/isolated`), Walled Garden MikroTik dinamis, fallback auto-kick session. |
| **Role-Based Portals** | 5 Portal terdedikasi: Admin Dashboard (`/admin`), Customer Portal (`/customer`), Agent Reseller (`/agent`), Technician (`/technician`), dan First-Time Setup Wizard (`/setup`). |

---

## 1-Command Turnkey Deployment (VPS Baru)

Untuk VPS baru (Ubuntu 20.04 / 22.04 / 24.04 LTS), jalankan **satu baris perintah** ini di terminal SSH:

```bash
curl -fsSL https://raw.githubusercontent.com/Ak3ww/euginebillv2/main/scripts/install.sh | sudo bash
```

*(Atau via Git Clone manual)*:
```bash
git clone https://github.com/Ak3ww/euginebillv2.git /var/www/EugineBill-radius
cd /var/www/EugineBill-radius
sudo bash scripts/install.sh
```

### Apa Saja yang Diinstal Otomatis?
1. **Node.js 20 LTS, MySQL Server, & PM2**
2. **Nginx Reverse Proxy**: Port 80 & 443 langsung terhubung ke Next.js (port 3000), support WebSocket & batas upload 100MB.
3. **FreeRADIUS 3.x + MySQL**: Langsung tersambung ke database `euginebill` dengan patch OpenSSL MD4 provider.
4. **WireGuard VPN Server**: Aktif pada port `51820/UDP` (Subnet `10.200.0.0/24`).
5. **L2TP/IPSec VPN Server**: Aktif (strongSwan + xl2tpd, Subnet `10.201.0.0/24`).
6. **Firewall UFW**: Seluruh port otomatis dibuka (Web 80/443, Winbox 10001-10999, ONT Remote 24000-24999, FreeRADIUS 1812/1813/3799, VPN 51820/500/4500/1701).
7. **Persistent Storage**: `/var/data/EugineBill/uploads` & auth WhatsApp Baileys.
8. **3 Layanan PM2**: `EugineBill-radius` (Web), `EugineBill-wa` (WhatsApp Bot), dan `EugineBill-cron` (Cron Job otomatis).
9. **First-Time Setup Wizard**: Buka browser di `http://IP_VPS/setup` untuk membuat akun Super Admin dan mengisi profil usaha Anda.

---

## First-Time Setup Wizard (`/setup`)

Tidak ada lagi kredensial default yang rentan. Setelah instalasi selesai:
1. Buka browser: `http://IP_VPS/setup`
2. **Langkah 1**: Masukkan Nama ISP, Telepon, Email, dan Alamat Kantor.
3. **Langkah 2**: Buat Akun Super Admin Utama (Nama, Username Login, Email, Password).
4. **Langkah 3**: Konfigurasi Prefix ID Pelanggan (contoh `EB-`) & Tanggal Jatuh Tempo Tagihan (contoh `20`).
5. Klik **Selesaikan Inisialisasi** -> Halaman `/setup` otomatis terkunci permanen dan Anda langsung dialihkan ke login `/admin/login`.

---

## Updating Existing System (Safe Patch)

Untuk memperbarui sistem tanpa risiko kehilangan data pelanggan, database, atau konfigurasi:

```bash
sudo bash scripts/safe-update.sh
```
Skrip ini otomatis membuat snapshot database MySQL (`mysqldump` terkompresi `.sql.gz`), membackup file `.env`, melakukan `git pull`, sinkronisasi skema database, build aplikasi, dan me-reload proses PM2 tanpa downtime.

---

## Technical Documentation Index

Dokumentasi lengkap terbagi ke dalam panduan teknis pada folder `docs/`:

| Dokumen Panduan | Deskripsi |
| :--- | :--- |
| [EUGINEBILL_EASY_SETUP_GUIDE.md](docs/setup/EUGINEBILL_EASY_SETUP_GUIDE.md) | **Panduan Master Easy Setup VPS & MikroTik Siap Pakai** (Beberapa Klik & Paste Script). |
| [BUILTIN_TR069_ACS_SETUP_GUIDE.md](docs/mikrotik/BUILTIN_TR069_ACS_SETUP_GUIDE.md) | Panduan Built-in TR-069 ACS Native EugineBill (Zero Docker/Mongo). |
| [PANDUAN_SETUP_LENGKAP_OLT_MIKROTIK.md](deployment-pack-client/PANDUAN_SETUP_LENGKAP_OLT_MIKROTIK.md) | Panduan Lengkap Fondasi FTTH: OLT VSOL 1600GS & MikroTik RSC Siap Pakai. |
| [VENDOR_DEPLOYMENT_GUIDE.md](docs/setup/VENDOR_DEPLOYMENT_GUIDE.md) | Panduan lengkap vendor menyewakan VPS EugineBill ke klien ISP baru. |
| [CUSTOMER_EXPERIENCE_PAYMENT_GUIDE.md](docs/customer/CUSTOMER_EXPERIENCE_PAYMENT_GUIDE.md) | Panduan pembayaran pelanggan, transfer bank manual, dan gateway. |
| [TROUBLESHOOTING.md](docs/getting-started/TROUBLESHOOTING.md) | Panduan investigasi dan solusi kendala teknis (RADIUS, MySQL, VPN). |
| [COA_TROUBLESHOOTING_WORKFLOW.md](docs/getting-started/COA_TROUBLESHOOTING_WORKFLOW.md) | Panduan penanganan CoA disconnect dan MikroTik kick session. |
| [API_TESTING_GUIDE.md](docs/getting-started/API_TESTING_GUIDE.md) | Daftar dan panduan pengujian 150+ endpoint API EugineBill. |
| [GENIEACS-GUIDE.md](docs/features/GENIEACS-GUIDE.md) | Panduan TR-069 ACS dan manajemen modem ONT pelanggan. |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat patch lengkap dan catatan rilis setiap versi. |

---

## FreeRADIUS Architecture

Key config files at `/etc/freeradius/3.0/`:

| File | Purpose |
|------|---------|
| `mods-enabled/sql` | MySQL connection for user auth |
| `mods-enabled/rest` | REST API for voucher management |
| `sites-enabled/default` | Main auth logic (PPPoE realm support) |
| `clients.conf` | NAS/router clients (+ `$INCLUDE clients.d/`) |
| `sites-enabled/coa` | CoA/Disconnect-Request virtual server |

Config backup in `freeradius-config/` is auto-deployed by the installer.

### Auth Flow

**PPPoE:** `MikroTik → FreeRADIUS → MySQL (radcheck/radusergroup/radgroupreply)` → Access-Accept with Mikrotik-Rate-Limit

**Hotspot Voucher:** Same RADIUS path + `REST /api/radius/post-auth` → sets firstLoginAt, expiresAt, syncs keuangan

### RADIUS Tables

| Table | Purpose |
|-------|---------|
| `radcheck` | User credentials |
| `radreply` | User-specific reply attrs |
| `radusergroup` | User → Group mapping |
| `radgroupreply` | Group reply (bandwidth, session timeout) |
| `radacct` | Session accounting |
| `nas` | NAS/Router clients (dynamic) |

---

## ⏰ Cron Jobs (16 automated)

| Job | Schedule | Function |
|-----|----------|----------|
| Voucher Sync | Every 5 min | Sync voucher status with RADIUS |
| Disconnect Sessions | Every 5 min | CoA disconnect expired vouchers |
| Auto Isolir (PPPoE) | Every hour | Suspend overdue customers |
| FreeRADIUS Health | Every 5 min | Auto-restart if down |
| PPPoE Session Sync | Every 10 min | Sync radacct sessions |
| Agent Sales | Daily 1 AM | Update sales statistics |
| Invoice Generate | Daily 2 AM | Generate monthly invoices |
| Activity Log Cleanup | Daily 2 AM | Delete logs >30 days |
| Invoice Reminder | Daily 8 AM | Send payment reminders |
| Invoice Status | Daily 9 AM | Mark overdue invoices |
| Notification Check | Every 10 min | Process notification queue |
| Auto Renewal | Daily 8 AM | Prepaid auto-renew from balance |
| Webhook Log Cleanup | Daily 3 AM | Delete webhook logs >30 days |
| Session Monitor | Every 5 min | Security session monitoring |
| Cron History Cleanup | Daily 4 AM | Keep last 50 per job type |
| Suspend Check | Every hour | Activate/restore suspend requests |

All jobs can be triggered manually from **Settings → Cron** in the admin panel.

---

## � Android APK Builder

Buat APK Android (WebView wrapper) untuk 4 portal langsung di server VPS — tanpa GitHub Actions, tanpa Android Studio.

### 1) Setup Android SDK (satu kali via SSH)

```bash
apt-get update && apt-get install -y openjdk-17-jdk wget unzip && \
mkdir -p /opt/android/cmdline-tools && \
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdtools.zip && \
unzip -q /tmp/cmdtools.zip -d /opt/android/cmdline-tools && \
mv /opt/android/cmdline-tools/cmdline-tools /opt/android/cmdline-tools/latest && \
yes | /opt/android/cmdline-tools/latest/bin/sdkmanager --licenses && \
/opt/android/cmdline-tools/latest/bin/sdkmanager "platforms;android-34" "build-tools;34.0.0" && \
echo 'export ANDROID_HOME=/opt/android' >> /etc/environment && \
echo 'Selesai!'
```

> **Perkiraan waktu:** ~5–10 menit (download ~500MB). Disk yang dibutuhkan: ~2GB.

### 2) Build APK via Admin Panel

Buka **Admin → Download Aplikasi Android** → klik **Build APK** pada role yang diinginkan.

- Build berjalan di background (tidak timeout meski butuh beberapa menit)
- Status diperbarui otomatis setiap 3 detik
- Setelah selesai, tombol **Download APK** muncul

### 3) Build via API (opsional)

```bash
# Cek environment
curl http://YOUR_VPS/api/admin/apk/trigger

# Mulai build (role: admin | customer | technician | agent)
curl -X POST http://YOUR_VPS/api/admin/apk/trigger?role=customer \
  -H "Cookie: next-auth.session-token=..."

# Cek status
curl http://YOUR_VPS/api/admin/apk/status?role=customer

# Download APK
curl -OJ http://YOUR_VPS/api/admin/apk/file?role=customer \
  -H "Cookie: next-auth.session-token=..."
```

### Storage APK

| Path | Keterangan |
|------|------------|
| `/var/data/EugineBill/apk/{role}/app.apk` | File APK hasil build |
| `/var/data/EugineBill/apk/{role}/status.json` | Status & metadata build |
| `/var/data/EugineBill/apk/{role}/build.log` | Log Gradle |
| `/var/data/EugineBill/gradle-cache` | Cache Gradle (mempercepat build berikutnya) |

### Paket Aplikasi

| Role | Package ID | Warna |
|------|-----------|-------|
| Admin | `net.EugineBill.admin` | Biru |
| Customer | `net.EugineBill.customer` | Cyan |
| Technician | `net.EugineBill.technician` | Hijau |
| Agent | `net.EugineBill.agent` | Ungu |

---

## �🛠️ Common Commands

```bash
# PM2
pm2 status ; pm2 logs EugineBill-radius
pm2 restart ecosystem.config.js --update-env

# FreeRADIUS
systemctl restart freeradius
freeradius -XC    # Test config
radtest 'user@realm' password 127.0.0.1 0 testing123

# Database
mysql -u EugineBill_user -pEugineBillradius123 EugineBill_radius
mysqldump -u EugineBill_user -pEugineBillradius123 EugineBill_radius > backup.sql
```

---

## 🧯 Troubleshooting Cepat

### 1) Website tidak bisa diakses dari IP VPS

Jika `Nginx` dan app sudah jalan di server tapi dari internet tetap tidak bisa akses, biasanya masalah ada di layer jaringan (NAT/forwarding/firewall external), bukan di aplikasi.

```bash
# Di VM/VPS guest
ss -tulpn | grep -E ':80|:443|:3000'
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1
systemctl status nginx --no-pager
pm2 status
```

Jika semua check local di atas OK, cek mapping di host Proxmox/router/cloud firewall:

1. `Public:2020 -> VM:22` (SSH)
2. `Public:80 -> VM:80` (HTTP)
3. `Public:443 -> VM:443` (HTTPS)

Catatan: `IP:2020` adalah port SSH, bukan URL web aplikasi.

### 2) PM2 jalan tapi web tetap blank/error

```bash
pm2 status
pm2 logs EugineBill-radius --lines 100
cd /var/www/EugineBill-radius
npm run build
pm2 restart ecosystem.config.js --update-env
```

### 4) Jalankan diagnosa Nginx otomatis dari installer

Installer Nginx terbaru menambahkan self-check internal (`127.0.0.1:3000`, `127.0.0.1`) dan best-effort check publik (HTTP/HTTPS).

```bash
cd /var/www/EugineBill-radius
bash vps-install/install-nginx.sh
```

Jika warning menunjukkan HTTP publik tidak reachable, fokus perbaikan di NAT/port-forward/security-group, bukan di Next.js.

---

## 🔐 Security

```bash
# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw allow 1812/udp && ufw allow 1813/udp && ufw allow 3799/udp
```

1. Change default admin password on first login
2. Change MySQL passwords in `.env`
3. Configure SSL (Let's Encrypt or Cloudflare)
4. Enable UFW

---

## 📡 CoA (Change of Authorization)

Sends real-time speed/disconnect commands to MikroTik without dropping PPPoE connections.

**MikroTik requirement:** `/radius incoming set accept=yes port=3799`

**API:** `POST /api/radius/coa` — actions: `disconnect`, `update`, `sync-profile`, `test`

Auto-triggered when: PPPoE profile speed is edited (syncs all active sessions).

---

## 📲 WhatsApp Providers

| Provider | Base URL | Auth |
|----------|----------|------|
| Fonnte | `https://api.fonnte.com/send` | Token |
| WAHA | `http://IP:PORT` | API Key |
| GOWA | `http://IP:PORT` | `user:pass` |
| MPWA | `http://IP:PORT` | API Key |
| Wablas | `https://pati.wablas.com` | Token |

---

## ⏱️ Timezone

| Layer | Timezone | Note |
|-------|----------|------|
| Database (Prisma) | UTC | Prisma default |
| FreeRADIUS | WIB (UTC+7) | Server local time |
| PM2 env | WIB | `TZ: 'Asia/Jakarta'` in ecosystem.config.js |
| API / Frontend | WIB | Auto-converts UTC ↔ WIB |

For WITA (UTC+8) or WIT (UTC+9): change `TZ` in `.env`, `ecosystem.config.js`, and `src/lib/timezone.ts`.

---

## 📋 Admin Modules

Dashboard · PPPoE · Hotspot · Agent · Invoice · Payment · Keuangan · Sessions · WhatsApp · Network (OLT/ODC/ODP) · GenieACS · Settings

**Roles:** SUPER_ADMIN · FINANCE · CUSTOMER_SERVICE · TECHNICIAN · MARKETING · VIEWER

---

## 📝 Changelog

Bagian ini otomatis sinkron dari `CHANGELOG.md` saat file changelog berubah di GitHub.

<!-- AUTO-CHANGELOG:START -->

### v2.40.45 — 2026-09-23

### Auto-Deduct Inventory saat Tambah Pelanggan Baru & Data Linking Otomatis pada Penerbitan SPK Admin

- **Latar Belakang / Kebutuhan (Issue & Context)**:
  1. Saat admin mendaftarkan pelanggan PPPoE baru dengan perangkat modem (mengisi Serial Number ONT atau MAC Address), aset modem sebelumnya tidak otomatis terpotong dari inventori (`AVAILABLE` -> `IN_USE`), stok master katalog tidak terpotong (`currentStock`), dan tidak tercatat di `inventoryMovement` bertipe `OUT`.
  2. Jika nomor Serial Number ONT belum pernah didaftarkan ke inventori, sistem belum menangani potensi collision unique constraint secara aman dengan fallback query.
  3. Saat pelanggan didaftarkan dan sudah ada Surat Tugas (Work Order / SPK) yang berstatus terbuka (`OPEN`, `ASSIGNED`, `IN_PROGRESS`) untuk pelanggan atau nomor telepon tersebut, data perangkat (`sn`, `mac`, `modemType`) belum tersinkronisasi otomatis ke `workOrder.reportData` dan `assignedAssets`.
  4. Saat admin menerbitkan Surat Tugas (SPK) baru di portal admin (`/api/admin/work-orders`), teknisi lapangan harus mengisi ulang Serial Number dan MAC address modem secara manual karena sistem belum meng-query dan menyematkan data perangkat pelanggan yang telah terpasang ke dalam `reportData` dan menghubungkan `assignedAssets`.

- **Solusi Arsitektural & Perubahan Teknis**:
  1. **Auto-Deduct Inventory & Stock Decrement saat Pasang Baru (PSB)**:
     - Lokasi: `src/server/services/pppoe.service.ts` (`createPppoeUser`).
     - Menghitung `effectiveSn`: jika `rawOntSn` kosong tetapi `macAddress` tersedia, sistem menggunakan `rawMac.replace(/[:-]/g, '').toUpperCase()` sebagai fallback Serial Number.
     - Mencari aset di `inventoryAsset` berdasarkan ID, raw SN, uppercase SN, atau MAC address dengan menyertakan relasi `item`.
     - Jika aset ditemukan:
       - Status aset diperbarui menjadi `IN_USE`, `currentCustomerId: user.id`, dan `installedAt: new Date()`.
       - Merekam riwayat di `customerDeviceHistory` dengan `action: 'INSTALLED'`, `reason: 'Pasang Baru (PSB)'`.
       - Mengurangi `item.currentStock` jika `currentStock > 0` dan mencatat mutasi pengeluaran barang di `prisma.inventoryMovement` (`movementType: 'OUT'`, `referenceNo: 'PSB-' + customerId/username`).
     - Jika aset belum terdaftar di inventori:
       - Otomatis mendaftarkan unit baru ke `inventoryAsset` dengan status `IN_USE`, `currentCustomerId: user.id`, dan mendeteksi vendor/model melalui `detectOntVendorAndModel`.
       - Menangani kemungkinan collision unique constraint secara aman dengan blok `catch` dan fallback query untuk memperbarui aset yang sudah ada.
     - Jika ada Surat Tugas (SPK) terbuka (`OPEN`, `ASSIGNED`, `IN_PROGRESS`) untuk pelanggan atau nomor teleponnya:
       - Memperbarui `workOrder.reportData` dengan `{ sn, mac, modemType }` tanpa menimpa data ODP/port yang sudah ada.
       - Menautkan aset ke work order melalui `assignedAssets: { connect: { id: targetAsset.id } }` dan menghubungkan `linkedUserId`.
  2. **Data Linking Otomatis pada Penerbitan SPK Admin**:
     - Lokasi: `src/app/api/admin/work-orders/route.ts` (`POST`).
     - Saat admin menerbitkan SPK dan `finalLinkedUserId` terdeteksi atau ditemukan melalui pencarian telepon/nama:
       - Meng-query perangkat modem pelanggan secara berlapis: `inventoryAssets` (assetType: `MODEM`, order by `updatedAt: desc`), `customerDeviceHistory`, `oltOnuStatus`, dan `macAddress` dari `pppoeUser`.
       - Otomatis mendeteksi vendor dan model modem jika belum terisi via `detectOntVendorAndModel`.
       - Memasukkan data perangkat langsung ke dalam `reportData: { sn: foundSn, mac: foundMac, modemType: foundModel }` (digabungkan secara aman dengan draft reportData).
       - Menghubungkan aset ke Surat Tugas via `assignedAssets: { connect: { id: foundAssetId } }` dengan fallback aman tanpa fatal error.

- **Files**:
  - `CHANGELOG.md`
  - `docs/AI_PROJECT_MEMORY.md`
  - `src/server/services/pppoe.service.ts`
  - `src/app/api/admin/work-orders/route.ts`
  - `src/app/api/pppoe/users/[id]/device-history/route.ts`
  - `src/app/api/pppoe/users/[id]/replace-device/route.ts`
  - `src/app/api/pppoe/users/[id]/sync-radius/route.ts`

### v2.40.44 — 2026-09-20

### Fix Ganti Modem (Next.js 15 Promise Params & Flexible ID Resolution), Router Route Alias, /docs Layout, & One-Time OLT Modem Sync

- **Latar Belakang / Kebutuhan (Issue & Context)**:
  1. Fitur **Ganti Modem** gagal dieksekusi dengan rentetan error pada browser console:
     - `GET /api/pppoe/routers: 404 (Not Found)`
     - `GET /api/pppoe/users/37383/device-history: 500 (Internal Server Error)`
     - `POST /api/pppoe/users/37383/replace-device: 500 (Internal Server Error)`
     - `GET /docs?_rsc=1bpeg: 404 (Not Found)`
  2. Pada Next.js 15+, parameter route handler `{ params }` merupakan `Promise`. Karena belum di-`await` pada endpoint `device-history` dan `replace-device`, variabel `id` bernilai `undefined`, yang memicu kegagalan validasi Prisma internal (HTTP 500).
  3. URL detail pelanggan sering diakses menggunakan username/nomor pelanggan seperti `37383` (bukan CUID/UUID). Pencarian langsung pada `where: { id }` gagal dan foreign key constraint pada tabel relasi menolak nilai string non-UUID.
  4. Pengguna juga meminta sinkronisasi satu-pintu untuk seluruh modem fisik di OLT ke profil pelanggan (kartu Perangkat ONT) dan master inventori aset.

- **Solusi Arsitektural & Perubahan Teknis**:
  1. **Next.js 15 Promise Params & Flexible ID Resolution**:
     - Memperbarui signature `device-history/route.ts` dan `replace-device/route.ts` menjadi `{ params }: { params: Promise<{ id: string }> }` dengan `const { id: rawId } = await params`.
     - Mengimplementasikan pencarian fleksibel `pppoeUser.findFirst({ where: { OR: [{ id: rawId }, { customerId: rawId }, { username: rawId }] } })` sehingga menjamin didapatkannya `customer.id` bertipe UUID asli untuk foreign key database.
     - Menambahkan fallback otomatis: jika aset modem belum ada di inventori, sistem mengecek tabel `oltOnuStatus` yang terhubung dengan pelanggan dan menyinkronkannya ke inventori secara instan.
  2. **Router API Endpoint & User Detail Page**:
     - Memperbarui pemanggilan router pada `src/app/admin/pppoe/users/[id]/page.tsx` ke `/api/network/routers`.
     - Membuat endpoint alias resmi `src/app/api/pppoe/routers/route.ts` agar pemanggilan legacy tetap sukses dengan status 200 OK.
     - Menggunakan `user?.id || id` pada fungsi `fetchDeviceHistory` dan `handleGantiModem`.
  3. **RSC Prefetch Fix untuk /docs**:
     - Membuat `src/app/docs/layout.tsx` dengan `export const dynamic = 'force-dynamic'` guna mencegah 404 pada dynamic RSC prefetch `?_rsc=...`.
     - Menyediakan halaman `src/app/admin/docs/page.tsx` agar dokumentasi dapat diakses langsung dari dashboard admin.
  4. **One-Time OLT Modem to Customers & Inventory Synchronization Engine**:
     - Mengimplementasikan `syncAllOltsWithCustomersAndInventory` pada `src/server/services/olt-inventory-sync.service.ts` dengan multi-pass matching (Pass 1: SN pada riwayat & SPK, Pass 2: MAC address, Pass 3: Smart Matcher / Dice similarity pada deskripsi OLT).
     - Menautkan ONU ke `oltOnuStatus.customerId`, mendaftarkannya ke `inventory_assets` (`IN_USE`, `AVAILABLE`, atau `Fasum`), dan mencatat `customer_device_histories` agar langsung tampil di tab "Perangkat ONT".
     - Membuat skrip CLI `scripts/sync-olt-modems-to-customers-and-inventory.ts` (`npm run sync:olt-modems`) dan endpoint API admin `POST /api/olt/sync-all-to-customers`.
     - Menambahkan tombol **Sync ke Pelanggan & Inventori** di halaman panel admin `/admin/network/olts`.

- **Files**:
  - `package.json`
  - `CHANGELOG.md`
  - `docs/AI_PROJECT_MEMORY.md`
  - `docs/inventory/PANDUAN_SINKRONISASI_MODEM_OLT_DAN_GANTI_MODEM.md`
  - `src/app/api/pppoe/users/[id]/device-history/route.ts`
  - `src/app/api/pppoe/users/[id]/replace-device/route.ts`
  - `src/app/api/pppoe/routers/route.ts`
  - `src/app/admin/pppoe/users/[id]/page.tsx`
  - `src/app/docs/layout.tsx`
  - `src/app/admin/docs/page.tsx`
  - `src/server/services/olt-inventory-sync.service.ts`
  - `src/app/api/olt/sync-all-to-customers/route.ts`
  - `src/app/admin/network/olts/page.tsx`
  - `scripts/sync-olt-modems-to-customers-and-inventory.ts`

### v2.40.43 — 2026-09-19

### Final Clean Repository Release: Penghapusan Script One-Time Bulk Sync Pasca-Sinkronisasi Sukses

- **Latar Belakang / Kebutuhan (Issue & Context)**:
  1. Proses sinkronisasi paket billing dan secret pelanggan MikroTik & FreeRADIUS telah selesai dieksekusi dengan sukses dan seluruh akun aktif telah termigrasi dengan profil kecepatan yang sesuai.
  2. Pengguna meminta script one-time `scripts/sync-all-to-mikrotik.js` dihapus agar repositori 100% bersih dan siap ditarik (*pull / sync*) ke seluruh client satu per satu tanpa menyisakan file migrasi sementara.

- **Solusi Arsitektural & Perubahan Teknis**:
  1. Menghapus script one-time `scripts/sync-all-to-mikrotik.js`.
  2. Repositori kini berada dalam kondisi *Pure Clean Production State*, bebas dari skrip migrasi sementara, siap untuk ditribusikan / di-pull oleh seluruh client dan VPS cabang.

- **Files**:
  - `package.json`
  - `CHANGELOG.md`
  - `docs/AI_PROJECT_MEMORY.md`
  - Deleted: `scripts/sync-all-to-mikrotik.js`

### v2.40.42 — 2026-09-19

### Repository Deep Clean: Pembersihan Menyeluruh File Sampah, Dead Code, Duplikat, & Perampingan Repo (~30+ MB)

- **Latar Belakang / Kebutuhan (Issue & Context)**:
  1. Pengguna meminta pembersihan menyeluruh (*full clean up*) terhadap seluruh file yang sudah tidak digunakan lagi (script one-time, installer lama, dead components, build artifacts, dan dokumentasi duplikat/usang) agar ukuran clone/pull pada client dan VPS ramping, bersih, dan cepat.
  2. Ditemukan file binary Windows `bin/server.exe` (~27 MB) dan dump OID SNMP `ZTE_OID_TABLE.md` (~2.6 MB) yang mengotori root, serta file-file komponen UI yang sudah orphaned dan seed duplikat yang tidak lagi terpakai.

- **Solusi Arsitektural & Perubahan Teknis**:
  1. **Pembersihan Root & Build Artifacts (Menghemat ~27+ MB)**:
     - Menghapus binary lokal `bin/server.exe` (26.8 MB).
     - Menghapus build artifact `tsconfig.tsbuildinfo` (481 KB).
     - Menghapus konfigurasi testing usang `nginx-frontend.conf` dan log sensitif lama `INSTALLATION_INFO.txt`.
     - Merelokasi dump SNMP 28.128 baris `ZTE_OID_TABLE.md` ke direktori dokumentasi referensi `docs/references/`.
     - Menghapus dead script `scripts/migrate-sku.ts` (sudah diserap penuh ke `scripts/run-migrations.ts`).
  2. **Pembersihan Dokumentasi Usang, Duplikat & Temp Prompts (Menghemat ~600+ KB)**:
     - Menghapus duplikat beku `docs/getting-started/CHANGELOG.md` (~293 KB).
     - Menghapus prompt AI sementara: `docs/GO_MIGRATION_PROMPT.md`, `docs/EMG_INVENTORY_DOCUMENT_NUMBERING_SPEC.md`.
     - Menghapus duplikat dokumentasi lama: `docs/ISOLATION_SYSTEM.md`, `docs/README.md`, `docs/SECURITY_FIXES_APPLIED.md`, `docs/AUDIT_REPORT.md`.
     - Menghapus roadmap/restrukturisasi lampau yang sudah 100% selesai: `docs/MAINTENANCE_ROADMAP.md`, `docs/RESTRUCTURING_GUIDE.md`, `docs/ROADMAP_RESTRUCTURING.md`, direktori `docs/restructuring/`.
     - Menghapus dokumentasi sub-project non-aktif: `docs/mobile-app/` (Expo native lama yang telah digantikan PWA Web Push) dan duplikat rusak mojibake `docs/mikrotik/MIKROTIK_RADIUS_COA_COMPLETE_SETUP.md`.
  3. **Pembersihan Aset Publik & Stray Payments**:
     - Menghapus file boilerplate default Next.js (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
     - Membersihkan stray upload lokal yang melanggar aturan persistent storage: `public/uploads/payments/`.
     - Menghapus gambar dummy dan duplikat tak terpakai: `public/images/customer_card_bg.png`, `public/images/qris-official-eugine.png`, `public/images/eugine-logo.png`.
  4. **Pembersihan Dead Components, Utilities & Seeds**:
     - Menghapus scratch note `src/app/walkthrough.md`.
     - Menghapus file seed duplikat `prisma/seeds/whatsapp-manual-payment-templates.ts` (sudah dimerge ke `whatsapp-templates.ts`).
     - Menghapus utility mati tanpa referensi: `src/lib/score-card-canvas.ts`, `src/server/services/company.service.ts`.
     - Menghapus komponen UI yang tidak pernah di-import (orphaned): `OntRemoteViewerModal.tsx`, `FreeRadiusStatusCard.tsx`, `TrafficMonitor.tsx`, `TrafficChartMonitor.tsx`, `NetworkTopologyMap.tsx`, `AssignCustomerDialog.tsx`, `EditAssignmentDialog.tsx`, `SplicePointsSection.tsx`, `SplitterSection.tsx`, serta direktori `src/components/genieacs/`.
  5. **Perbaikan Skrip Package.json**:
     - Memperbaiki path `"db:seed:templates"` ke `prisma/seeds/isolation-templates.ts`.
     - Menghapus perintah `"db:fix-radius"` yang merujuk pada migration sql yang tidak ada.

- **Files**:
  - `package.json`
  - `CHANGELOG.md`
  - `docs/AI_PROJECT_MEMORY.md`
  - 50+ file dead/unused dieliminasi secara aman (verified `tsc --noEmit` exit code 0).

### v2.40.41 — 2026-09-19

### Hardened Bulk Sync Shield: Zero OFF to MikroTik, Proteksi Ganti User, & Auto-Heal Pelanggan Lunas

- **Latar Belakang / Kebutuhan (Issue & Context)**:
  1. Pengguna memberikan peringatan keras bahwa pada database terdapat akun-akun yang berstatus OFF / berhenti namun sudah melakukan pembayaran (lunas), akun OFF yang masa aktifnya belum habis, serta akun-akun lama yang username dasarnya sudah digantikan oleh pelanggan baru (*Ganti User / PPPoE Reuse*).
  2. Eksekusi sinkronisasi massal DILARANG KERAS memasukkan akun berstatus OFF ke dalam secret MikroTik, DILARANG mengisolir atau mendisable pelanggan yang sudah membayar, dan DILARANG menimpa pelanggan baru yang menggunakan kode EMG yang sama.

- **Solusi Arsitektural & Perubahan Teknis**:
  1. **Strict Zero-OFF Policy ke MikroTik (`scripts/sync-all-to-mikrotik.js`)**:
     - Seluruh akun dengan status `stop`, `stopped`, `suspended`, `dismantled`, `dismantle`, `terminated`, `cancelled`, `inactive`, `blocked`, atau username mengandung pola `-OFF-`, `-STOP-`, `-CABUT-`, `_OFF_`, `(OFF)` **100% DILEWATI (SKIP)** dan tidak akan pernah ditulis atau dimasukkan ke MikroTik maupun FreeRADIUS.
  2. **Safety Shield Ganti User (PPPoE Username Reuse Protection)**:
     - Skrip secara otomatis memetakan seluruh pelanggan aktif dan membandingkannya dengan `baseUsername` akun-akun OFF.
     - Jika username dasar telah digunakan oleh pelanggan baru, skrip secara otomatis melindungi pelanggan baru tersebut dan mengabaikan akun lama, mencegah tertimpanya password, profil, atau ID pelanggan baru.
  3. **Auto-Heal & Perlindungan Anti-Isolir Salah (Sudah Bayar / Expired Belum Habis)**:
     - Untuk seluruh akun calon aktif, skrip memeriksa riwayat tagihan (`status === 'PAID'`) dan masa aktif (`expiredAt > now`).
     - Jika sebuah akun di database tercatat berstatus `isolated` namun terbukti sudah lunas atau masa aktifnya masih berlaku, skrip otomatis membatalkan profil isolir, menerapkan profil paket aslinya di MikroTik, dan menyembuhkan (*auto-heal*) status di database menjadi `active`.
  4. **Audit Anomali & Rekomendasi Administratif Realtime**:
     - Skrip menampilkan laporan deteksi anomali: mendata secara transparan jika ada akun OFF yang terdeteksi memiliki tagihan lunas agar admin dapat mereaktivasi akun tersebut secara resmi melalui portal tanpa merusak data pelanggan baru.
  5. **Scoping Ketat Router Cibinong vs Citeureup**:
     - Memastikan router Cibinong hanya menyinkronkan prefix `EMG` (tanpa `C`) dan menolak seluruh user Citeureup (`EMGC*`), begitupun sebaliknya.

- **Files**:
  - `package.json`
  - `scripts/sync-all-to-mikrotik.js`
  - `CHANGELOG.md`
  - `docs/AI_PROJECT_MEMORY.md`

<!-- AUTO-CHANGELOG:END -->

See full changelog: [docs/getting-started/CHANGELOG.md](docs/getting-started/CHANGELOG.md)

## 📚 Documentation

| File | Description |
|------|-------------|
| [docs/INSTALLATION-GUIDE.md](docs/INSTALLATION-GUIDE.md) | Complete VPS installation |
| [docs/GENIEACS-GUIDE.md](docs/GENIEACS-GUIDE.md) | GenieACS TR-069 setup & WiFi management |
| [docs/AGENT_DEPOSIT_SYSTEM.md](docs/AGENT_DEPOSIT_SYSTEM.md) | Agent balance & deposit |
| [docs/RADIUS-CONNECTIVITY.md](docs/RADIUS-CONNECTIVITY.md) | RADIUS architecture |
| [docs/FREERADIUS-SETUP.md](docs/FREERADIUS-SETUP.md) | FreeRADIUS configuration guide |

## 📝 License

MIT License - Free for commercial and personal use

## 👨‍💻 Development

Built with ❤️ for Indonesian ISPs

**Important**: Always use `formatWIB()` and `toWIB()` functions when displaying dates to users.
