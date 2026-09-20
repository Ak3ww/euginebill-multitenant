/**
 * EugineBill — One-Time OLT Modem to Customers & Inventory Sync Script
 * 
 * Melakukan rekonsiliasi satu-pintu menyeluruh:
 * 1. Menautkan ONU aktif di seluruh OLT ke akun pelanggan PPPoE (berdasarkan SN, MAC, atau nama/deskripsi)
 * 2. Mendaftarkan unit modem ke master inventori (inventory_assets)
 *    - Status 'IN_USE' dan currentCustomerId untuk modem pelanggan
 *    - Status 'IN_USE' untuk perangkat fasilitas umum (Fasum / Lapangan)
 *    - Status 'AVAILABLE' untuk modem standby di OLT / gudang
 * 3. Mencatat riwayat pemasangan (customer_device_histories) agar langsung muncul di kartu "Perangkat ONT"
 *    pada halaman profil detail pelanggan (/admin/pppoe/users/[id]).
 * 
 * Penggunaan:
 *   npx tsx scripts/sync-olt-modems-to-customers-and-inventory.ts
 */

import { syncAllOltsWithCustomersAndInventory } from '../src/server/services/olt-inventory-sync.service';

async function main() {
  console.log('================================================================');
  console.log('🚀 EUGINEBILL: SINKRONISASI MODEM OLT -> PELANGGAN & INVENTORI');
  console.log('================================================================');
  console.log('Memulai proses pemindaian dan pencocokan cerdas...\n');

  const startTime = Date.now();

  try {
    const stats = await syncAllOltsWithCustomersAndInventory(75);

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n================================================================');
    console.log('✅ HASIL SINKRONISASI SELESAI');
    console.log('================================================================');
    console.log(`⏱️ Waktu Eksekusi              : ${elapsedSec} detik`);
    console.log(`📡 Total ONU di Semua OLT      : ${stats.totalOnus} unit`);
    console.log(`👥 Total Pelanggan PPPoE       : ${stats.totalCustomers} pelanggan`);
    console.log(`🔗 Sudah Tertaut Sebelumnya    : ${stats.alreadyLinkedCount} unit`);
    console.log(`✨ Baru Berhasil Ditautkan     : ${stats.newlyMatchedCount} unit`);
    console.log(`🏢 Fasilitas Umum (Fasum)      : ${stats.fasumCount} unit`);
    console.log(`📦 Unassigned (Stok Standby)   : ${stats.unassignedCount} unit`);
    console.log(`➕ Inventori Baru Didaftarkan  : ${stats.inventoryCreatedCount} unit`);
    console.log(`🔄 Inventori Diperbarui        : ${stats.inventoryUpdatedCount} unit`);
    console.log('================================================================\n');

    if (stats.matchedDetails.length > 0) {
      console.log('📋 DAFTAR MODEM YANG TERHUBUNG KE PELANGGAN:');
      stats.matchedDetails.forEach((item, idx) => {
        console.log(
          `  ${idx + 1}. [${item.oltName} - ${item.location}] SN: ${item.serialNumber} -> ${item.customerName} (${item.customerUsername}) [${item.matchReason}]`
        );
      });
    }

    console.log('\n🎉 Seluruh modem OLT kini telah tersinkronisasi ke profil pelanggan dan inventori EugineBill!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Terjadi kesalahan fatal saat sinkronisasi:', error);
    process.exit(1);
  }
}

main();
