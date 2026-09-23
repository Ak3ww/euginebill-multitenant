# Modul Terpusat Kalkulasi Masa Aktif dan Jatuh Tempo Billing PPPoE

Modul terpusat `src/server/services/billing/billing-cycle.service.ts` bertanggung jawab atas standardisasi seluruh perhitungan masa aktif (`expiredAt`) dan tanggal jatuh tempo (`dueDate`) pelanggan PPPoE di platform EugineBill.

---

## 1. Latar Belakang & Masalah Sebelumnya

Sebelum modul ini dibuat:
1. **Perhitungan Expiry Terfragmentasi**: Masing-masing pintu pembayaran (Admin Mark Paid, Admin Extend, Payment Gateway Webhook, Manual Payment Approval, Cron Auto-Renewal, dan Pendaftaran Pelanggan Baru) mengimplementasikan perpanjangan tanggal masa aktif secara terpisah menggunakan `setMonth()`, `addMonths()`, atau `setDate()`.
2. **Date Drifting & Jam Tidak Konsisten**: Perhitungan manual menyebabkan pergeseran tanggal jatuh tempo di bulan-bulan dengan jumlah hari berbeda (misal 28 Feb vs 31 Jan) serta jam kedaluwarsa yang tidak seragam (sebagian 00:00:00 UTC, sebagian jam saat pembayaran).
3. **Prorate & Pelanggan Telat Tidak Terkunci**: Pelanggan yang membayar terlambat atau berlangganan di pertengahan bulan tidak terkunci secara konsisten pada siklus tagihan berjalan (siklus jatuh tempo tanggal 6 dengan batas masa aktif tanggal 5 pukul 23:59:59 WIB).

---

## 2. Aturan Bisnis & Logika Inti

### A. Komponen Waktu & Timezone WIB (UTC+7)
- Format jam akhir masa aktif pelanggan selalu seragam: **23:59:59.999 WIB** (Western Indonesia Time, UTC+7), yang setara dengan **16:59:59.999 UTC** pada tanggal kalender yang sama.
- Seluruh perhitungan kalender mengonversi tanggal referensi ke waktu dinding (*wall-clock*) WIB untuk menghindari anomali offset server UTC.

### B. Tanggal Jatuh Tempo (`effectiveDueDay`) dan Batas Masa Aktif (`expiryDay`)
1. **Hari Tagihan / Jatuh Tempo (`effectiveDueDay`)**:
   - Nilai diambil dari `billingDay || fixedBillingDate || 6` (rentang valid 1 - 31).
2. **Hari Masa Aktif Berakhir (`expiryDay`)**:
   - `effectiveDueDay - 1`.
   - Jika `effectiveDueDay === 1`, maka `expiryDay` adalah hari terakhir bulan sebelumnya (siklus kalender murni 1 bulan penuh).
   - Contoh:
     - Jika jatuh tempo tanggal 6: masa aktif berakhir pada tanggal **5 pukul 23:59:59.999 WIB**.
     - Jika jatuh tempo tanggal 10: masa aktif berakhir pada tanggal **9 pukul 23:59:59.999 WIB**.
     - Jika jatuh tempo tanggal 1: masa aktif berakhir pada **hari terakhir bulan sebelumnya pukul 23:59:59.999 WIB** (misal 30 September atau 31 Oktober).

### C. Siklus Terkunci (`shiftBillingDateIfLate === false`)
Default pada sistem:
1. **Pelanggan Baru / Prorate / Bayar Telat**:
   - Masa aktif jatuh tepat pada batas `expiryDay` di bulan tagihan berjalan.
   - Contoh di bulan September: batas masa aktif berikutnya adalah **5 Oktober pukul 23:59:59.999 WIB**.
2. **Pelanggan Rutin (Aktif)**:
   - Jika pelanggan masih aktif (misal aktif sampai 5 Oktober) dan membayar sebelum/pada tanggal 5 Oktober, masa aktif diperpanjang maju 1 siklus ke **5 November pukul 23:59:59.999 WIB**.
   - Jika membayar untuk multi-bulan (`validityValue > 1`), masa aktif maju sejumlah bulan yang dibayarkan.

### D. Siklus Bergeser (`shiftBillingDateIfLate === true`)
- Jika perusahaan mengaktifkan opsi ini dan pelanggan membayar terlambat (atau pelanggan baru):
  - Masa aktif bergeser mengikuti tanggal pembayaran: `paymentDate + validityValue`.
  - Jam tetap dikunci pada pukul **23:59:59.999 WIB**.

---

## 3. Kontrak API Modul

File: `src/server/services/billing/billing-cycle.service.ts`

### `calculateNextBillingExpiry`
Mendukung pemanggilan baik melalui Options Object maupun Positional Arguments:

```typescript
export interface CalculateNextBillingExpiryOptions {
  currentExpiredAt?: Date | null;
  billingDay?: number | null;
  fixedBillingDate?: number | null; // default: 6
  shiftBillingDateIfLate?: boolean; // default: false
  validityValue?: number; // default: 1
  validityUnit?: string; // default: 'MONTHS'
  paymentDate?: Date; // default: new Date()
  isNewInstallationOrProrate?: boolean;
}

export function calculateNextBillingExpiry(options: CalculateNextBillingExpiryOptions): Date;
export function calculateNextBillingExpiry(
  currentExpiredAt?: Date | null,
  billingDay?: number | null,
  fixedBillingDate?: number | null,
  shiftBillingDateIfLate?: boolean,
  validityValue?: number,
  validityUnit?: string,
  paymentDate?: Date,
  isNewInstallationOrProrate?: boolean
): Date;
```

### `getCycleDueDate`
Menghitung `dueDate` tagihan/invoice dari tanggal berakhirnya masa aktif (`expiryDate`):

```typescript
export function getCycleDueDate(expiryDate: Date, dueDay?: number | null): Date;
```
- Expiry 5 Oktober -> Due date 6 Oktober (23:59:59.999 WIB).
- Expiry 30 September dengan dueDay 1 -> Due date 1 Oktober (23:59:59.999 WIB).

---

## 4. Titik Integrasi Sistem

Modul ini telah terintegrasi di seluruh gerbang transaksi billing EugineBill:

1. **Admin Mark Paid** (`src/app/api/pppoe/users/[id]/mark-paid/route.ts`):
   - Menghitung perpanjangan masa aktif saat admin mencentang lunas invoice yang tertunggak.
2. **Admin Extension** (`src/app/api/pppoe/users/[id]/extend/route.ts`):
   - Menghitung masa aktif baru saat admin memperpanjang langganan atau mengganti paket.
   - Mengisi `dueDate` invoice baru sesuai `getCycleDueDate`.
3. **Payment Gateway Webhook** (`src/app/api/payment/webhook/route.ts`):
   - Menghitung masa aktif baru otomatis saat menerima callback pelunasan dari Tripay, Midtrans, atau Xendit.
4. **Manual Transfer Approval** (`src/app/api/manual-payments/[id]/route.ts`):
   - Menghitung masa aktif baru saat finance/admin menyetujui bukti transfer manual.
5. **Auto-Renewal Cron** (`src/server/jobs/auto-renewal.ts`):
   - Menghitung perpanjangan masa aktif saat sistem memotong saldo pelanggan prabayar.
6. **Auto-Isolation Cron** (`src/server/jobs/auto-isolation.ts`):
   - Menggunakan kalkulator yang sama untuk auto-healing `expiredAt` pada pelanggan yang tidak memiliki tagihan tertunggak.
7. **Pendaftaran User PPPoE Baru** (`src/server/services/pppoe.service.ts`):
   - Fungsi `createPppoeUser` menghitung masa aktif awal pelanggan baru secara akurat sesuai siklus tagihan berjalan.

---

## 5. Pengujian & Verifikasi

Unit test otomatis tersedia pada `tests/billing-cycle.test.ts` (18 skenario pengujian mencakup PSB, prorate, pembayaran rutin, pembayaran telat, multi-bulan, siklus shift, dueDay = 1, dan paket DAYS).
Jalankan pengujian via:
```bash
node ./node_modules/vitest/vitest.mjs run tests/billing-cycle.test.ts
```
