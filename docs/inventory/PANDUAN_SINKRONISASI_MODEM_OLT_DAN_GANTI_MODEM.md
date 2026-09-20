# Panduan Arsitektur: Sinkronisasi Modem OLT, Inventori Aset, & Fitur Ganti Modem

Dokumentasi ini merinci sistem rekonsiliasi satu-pintu (*one-door reconciliation*) antara modem fisik di OLT (ZTE, Huawei, VSOL, FiberHome, Hioso, dll.), profil pelanggan PPPoE, dan master inventori aset EugineBill.

---

## 1. Arsitektur Rekonsiliasi 1-Pintu (OLT <-> Pelanggan <-> Inventori)

EugineBill memberlakukan prinsip **OLT sebagai Single Source of Truth (SSOT)** untuk status fisik perangkat ONT di lapangan:
```
+-------------------------------------------------------------------------+
|                               OLT Hardware                              |
|         (ZTE C320/C300, VSOL V1600GS/ZF, Huawei MA5608T, dll.)          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼ (SNMP / Poller / Auto-Detect)
+-------------------------------------------------------------------------+
|                      Tabel Database: olt_onu_status                     |
|           (serialNumber, macAddress, description, customerId)           |
+-------------------------------------------------------------------------+
                    │                                   │
                    ▼                                   ▼
+------------------------------------+ +----------------------------------+
|    Tabel Database: pppoe_users     | | Tabel Database: inventory_assets |
|  - Profil Detail Pelanggan         | |  - Serial Number & MAC Address   |
|  - Kartu "Perangkat ONT"           | |  - Status: IN_USE / AVAILABLE    |
|  - Riwayat: customer_device_history| |  - Auto-Swap Protection          |
+------------------------------------+ +----------------------------------+
```

---

## 2. Cara Kerja Algoritma Smart Matching

Proses pencocokan modem OLT ke pelanggan dijalankan secara berlapis (*multi-pass waterfall*):

### Pass 1: Kecocokan Serial Number (100% Akurat)
- Memeriksa apakah Serial Number modem sudah pernah tercatat pada:
  1. `customerDeviceHistory` (riwayat penggantian/pemasangan perangkat pelanggan).
  2. Laporan SPK Teknisi (`workOrders.reportData.sn`).
  3. Aset inventori aktif (`inventory_assets.serialNumber`).

### Pass 2: Kecocokan MAC Address (100% Akurat)
- Membandingkan MAC Address ONU (dibersihkan dari karakter separator `:` atau `-`) dengan `pppoeUser.macAddress`.

### Pass 3: Smart Matcher pada Deskripsi OLT (Confidence Threshold >= 75%)
Jika ONU belum memiliki riwayat SN/MAC di database, sistem menganalisis kolom `description` pada OLT:
- **Pembersihan String (`cleanCustomerName`)**: Menghilangkan prefiks ISP (`PELANGGAN:`, `CUST:`, `USER:`), tanda baca, gelar kehormatan (`PAK`, `IBU`, `HJ`), dan ID telepon di ujung string.
- **Pencocokan Username / NIK**: Memeriksa kesamaan kata dengan `username` atau `customerId`.
- **Ekspansi Singkatan (`expandAbbreviations`)**: `M.` / `MUH.` -> `MUHAMMAD`, `ACH.` -> `AHMAD`, dll.
- **Bigram / Dice Similarity**: Mengukur kemiripan nama pelanggan dengan deskripsi OLT. Jika skor >= 75%, sistem secara otomatis menautkan ONU ke akun pelanggan tersebut.

---

## 3. Klasifikasi Aset Inventori Otomatis

Setiap modem yang dipindai dari OLT diklasifikasikan ke dalam `inventory_assets`:
1. **Modem Pelanggan (`status: IN_USE`)**:
   - Ditautkan ke `currentCustomerId: customer.id`.
   - Otomatis mencatat riwayat pemasangan `customerDeviceHistory` (action: `INSTALLED`, reason: `Sinkronisasi 1-Pintu OLT`).
   - Langsung tampil di kartu **Perangkat ONT** pada halaman profil `/admin/pppoe/users/[id]`.
2. **Perangkat Fasilitas Umum / Fasum (`status: IN_USE`, tanpa customerId)**:
   - Dideteksi jika deskripsi mengandung kata kunci: `FASUM`, `CCTV`, `MUSHOLA`, `MASJID`, `POS`, `SATPAM`, `BALAI`, `KANTOR`, `AP-`, `RT/RW`.
   - Lokasi disimpan dengan format: `Nama OLT Port X/Y:Z`.
3. **Modem Unassigned / Standby (`status: AVAILABLE`)**:
   - Modem yang tercolok di OLT tetapi belum tertaut ke pelanggan (stok siap pakai).

---

## 4. Fitur Ganti Modem & Perlindungan Auto-Swap

Ketika admin atau teknisi mengganti modem via modal **Ganti Modem**:
1. **Validasi Pelanggan Fleksibel**: Endpoint menerima ID baik berupa CUID/UUID maupun nomor pelanggan/username (`37383`).
2. **Auto-Dismantle Modem Lama**:
   - Modem lama yang sebelumnya berstatus `IN_USE` otomatis diubah menjadi `USED_GOOD`.
   - Tautan `currentCustomerId` dilepas (kembali ke inventori).
   - Log `customerDeviceHistory` dicatat dengan action `REPLACED_OLD`.
3. **Pemasangan Modem Baru**:
   - Modem baru diubah menjadi `IN_USE` dan ditautkan ke pelanggan.
   - Log `customerDeviceHistory` dicatat dengan action `REPLACED_NEW`.
   - MAC Address pada `pppoeUser` disinkronkan.
   - Penautan di tabel `oltOnuStatus` diperbarui (ONU lama dilepas, ONU baru ditautkan ke pelanggan).

---

## 5. Cara Menjalankan Sinkronisasi

### Metode 1: Melalui Web Admin UI (Satu Klik)
1. Masuk ke panel admin: **Jaringan -> OLT** (`/admin/network/olts`).
2. Di pojok kanan atas, klik tombol **Sync ke Pelanggan & Inventori**.
3. Konfirmasi dialog pop-up. Sistem akan menjalankan sinkronisasi latar belakang dan menampilkan ringkasan jumlah modem yang berhasil ditautkan.

### Metode 2: Melalui Terminal CLI (VPS / Local)
Jalankan perintah berikut di root folder proyek:
```bash
npm run sync:olt-modems
```
atau:
```bash
npx tsx scripts/sync-olt-modems-to-customers-and-inventory.ts
```

Output terminal akan merinci statistik eksekusi lengkap beserta daftar modem dan pelanggan yang berhasil dihubungkan.

---

## 6. Hard Invariants & Catatan Teknis Developer

1. **Next.js 15 Promise Params**:
   - Seluruh route handler dengan parameter dinamis (seperti `users/[id]`) WAJIB mengetik `{ params: Promise<{ id: string }> }` dan mengeksekusi `const { id } = await params`. Dilarang membaca `params.id` secara sinkron karena akan menghasilkan nilai `undefined`.
2. **Resolusi ID Pelanggan**:
   - URL admin dapat memuat CUID UUID atau nomor pelanggan/username (`37383`). Selalu gunakan:
     ```ts
     const user = await prisma.pppoeUser.findFirst({
       where: { OR: [{ id: rawId }, { customerId: rawId }, { username: rawId }] }
     });
     ```
     dan gunakan `user.id` (bukan `rawId`) untuk seluruh relasi foreign key database.
3. **Backward Compatibility Router Endpoint**:
   - Endpoint `/api/pppoe/routers` disediakan sebagai alias aman untuk `/api/network/routers` agar tidak memicu 404 pada pemanggilan komponen frontend legacy.
