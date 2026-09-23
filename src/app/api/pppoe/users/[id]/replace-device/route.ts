import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

// POST /api/pppoe/users/[id]/replace-device
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: rawId } = await params;
    if (!rawId) {
      return NextResponse.json({ error: 'ID pelanggan tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { newSerialNumber, reason, technicianName } = body;

    if (!newSerialNumber || !newSerialNumber.trim()) {
      return NextResponse.json({ error: 'Serial Number modem baru wajib diisi' }, { status: 400 });
    }

    const cleanSN = newSerialNumber.trim().toUpperCase();

    // 1. Verify customer exists using flexible lookup (UUID, customerId, or username)
    const customer = await prisma.pppoeUser.findFirst({
      where: {
        OR: [
          { id: rawId },
          { customerId: rawId },
          { username: rawId },
        ],
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 });
    }

    const customerId = customer.id; // Primary key UUID of pppoeUser

    // 2. Find or auto-create the asset
    let newAsset = await prisma.inventoryAsset.findFirst({
      where: {
        OR: [
          { serialNumber: cleanSN },
          { serialNumber: newSerialNumber.trim() },
          { macAddress: cleanSN },
        ],
      },
    });

    // Check if the SN/MAC matches an existing ONU on any OLT
    const matchingOnu = await prisma.oltOnuStatus.findFirst({
      where: {
        OR: [
          { serialNumber: cleanSN },
          { macAddress: cleanSN },
          { serialNumber: newSerialNumber.trim() },
        ],
      },
      include: { olt: { select: { name: true, vendor: true } } },
    });

    if (!newAsset) {
      // Auto-register new modem unit if not in inventory yet
      let catalogItem = await prisma.inventoryItem.findFirst({
        where: {
          OR: [
            { sku: 'EMG-CPE-ONT-GENERIC' },
            { sku: { contains: 'CPE-ONT' } },
            { name: { contains: 'ONT' } },
            { name: { contains: 'Modem' } },
          ],
        },
      });

      if (!catalogItem) {
        catalogItem = await prisma.inventoryItem.findFirst();
      }

      if (!catalogItem) {
        try {
          catalogItem = await prisma.inventoryItem.create({
            data: {
              sku: 'EMG-CPE-ONT-GENERIC',
              name: 'Modem ONT GPON Standar',
              categoryCode: 'CPE',
              subCategory: 'ONT',
              unit: 'pcs',
              isSerialized: true,
            },
          });
        } catch {
          catalogItem = await prisma.inventoryItem.findFirst();
        }
      }

      if (catalogItem) {
        let vendor = matchingOnu?.olt?.vendor || 'Generic';
        let model = matchingOnu ? `GPON ONT (${matchingOnu.olt?.name || ''})` : 'GPON ONT';
        if (cleanSN.startsWith('ZTEG')) { vendor = 'ZTE'; model = 'ZTE F609 V3'; }
        else if (cleanSN.startsWith('SKYW')) { vendor = 'Skyworth'; model = 'GN542VF'; }
        else if (cleanSN.startsWith('RTEG')) { vendor = 'Realtek'; model = 'RTL8672 GPON'; }
        else if (cleanSN.startsWith('YHTC')) { vendor = 'Yuhua'; model = 'YH-100G'; }
        else if (cleanSN.startsWith('FHTT')) { vendor = 'FiberHome'; model = 'HG6243C'; }
        else if (cleanSN.startsWith('HWTC')) { vendor = 'Huawei'; model = 'HG8245H'; }
        else if (cleanSN.startsWith('AZVG')) { vendor = 'VSOL'; model = 'V2801 Series'; }

        try {
          newAsset = await prisma.inventoryAsset.create({
            data: {
              itemId: catalogItem.id,
              assetType: 'MODEM',
              serialNumber: cleanSN,
              macAddress: matchingOnu?.macAddress || null,
              vendor,
              model,
              condition: 'NEW',
              status: 'AVAILABLE',
              notes: `Auto-registered saat pergantian modem pelanggan ${customer.name} (${customer.username})`,
            },
          });
        } catch {
          // Fallback if concurrent insert or casing collision
          newAsset = await prisma.inventoryAsset.findFirst({
            where: {
              OR: [
                { serialNumber: cleanSN },
                { serialNumber: newSerialNumber.trim() },
              ],
            },
          });
        }
      }
    }

    if (!newAsset) {
      return NextResponse.json({
        error: `Gagal mendaftarkan modem SN ${cleanSN}. Pastikan master katalog barang tersedia.`
      }, { status: 400 });
    }

    if (newAsset.assetType !== 'MODEM') {
      return NextResponse.json({ error: 'Perangkat ini bukan tipe MODEM' }, { status: 400 });
    }

    // Safety check: is it assigned to a different customer?
    if (newAsset.currentCustomerId && newAsset.currentCustomerId !== customerId) {
      const assignedCustomer = await prisma.pppoeUser.findFirst({
        where: { id: newAsset.currentCustomerId },
        select: { name: true, username: true },
      });
      return NextResponse.json({
        error: `Modem SN ${cleanSN} saat ini sedang terpasang pada pelanggan lain: ${assignedCustomer?.name || 'Lain'} (${assignedCustomer?.username || newAsset.currentCustomerId}). Harap lepas perangkat dari pelanggan tersebut terlebih dahulu.`
      }, { status: 400 });
    }

    const now = new Date();
    const techName = technicianName?.trim() || session.user.name || session.user.email || 'Admin';
    const replaceReason = reason?.trim() || 'Penggantian modem';

    await prisma.$transaction(async (tx) => {
      // 3. Find old active assets for this customer and mark as USED_GOOD
      const oldAssets = await tx.inventoryAsset.findMany({
        where: { currentCustomerId: customerId, assetType: 'MODEM' },
      });

      for (const oldAsset of oldAssets) {
        if (oldAsset.id === newAsset!.id) continue;
        await tx.inventoryAsset.update({
          where: { id: oldAsset.id },
          data: {
            status: 'USED_GOOD',
            currentCustomerId: null,
            currentWorkOrderId: null,
          },
        });

        // 4. Log old device removal
        await tx.customerDeviceHistory.create({
          data: {
            customerId,
            assetId: oldAsset.id,
            serialNumber: oldAsset.serialNumber,
            macAddress: oldAsset.macAddress,
            vendor: oldAsset.vendor,
            model: oldAsset.model,
            action: 'REPLACED_OLD',
            reason: replaceReason,
            technicianName: techName,
            removedAt: now,
          },
        });
      }

      // 5. Update new asset — set to IN_USE, link to customer
      await tx.inventoryAsset.update({
        where: { id: newAsset!.id },
        data: {
          status: 'IN_USE',
          currentCustomerId: customerId,
          installedAt: now,
          version: { increment: 1 },
        },
      });

      // 6. Log new device installation
      await tx.customerDeviceHistory.create({
        data: {
          customerId,
          assetId: newAsset!.id,
          serialNumber: cleanSN,
          macAddress: newAsset!.macAddress || matchingOnu?.macAddress || null,
          vendor: newAsset!.vendor,
          model: newAsset!.model,
          action: 'REPLACED_NEW',
          reason: replaceReason,
          technicianName: techName,
          installedAt: now,
        },
      });

      // 7. Update pppoeUser macAddress if available
      const resolvedMac = newAsset!.macAddress || matchingOnu?.macAddress || (cleanSN.length === 12 && /^[0-9A-Fa-f]{12}$/.test(cleanSN) ? cleanSN : null);
      if (resolvedMac) {
        await tx.pppoeUser.update({
          where: { id: customerId },
          data: { macAddress: resolvedMac },
        });
      }

      // 8. 1-Pintu: Synchronize OLT ONU assignments
      for (const oldAsset of oldAssets) {
        if (oldAsset.id === newAsset!.id) continue;
        if (oldAsset.serialNumber) {
          await tx.oltOnuStatus.updateMany({
            where: {
              customerId,
              OR: [
                { serialNumber: oldAsset.serialNumber },
                ...(oldAsset.macAddress ? [{ macAddress: oldAsset.macAddress }] : []),
              ],
            },
            data: { customerId: null },
          });
        }
      }

      await tx.oltOnuStatus.updateMany({
        where: {
          OR: [
            { serialNumber: cleanSN },
            ...(resolvedMac ? [{ macAddress: resolvedMac }] : []),
          ],
        },
        data: { customerId },
      });
    });

    // 9. Optional: kick active session on MikroTik router so new ONT connects and authenticates cleanly
    if (customer.routerId && customer.username) {
      try {
        const { PPPSecretService } = await import('@/server/services/mikrotik/ppp-secret.service');
        const targetRouter = await prisma.router.findUnique({
          where: { id: customer.routerId },
          include: { vpnClient: true },
        });
        if (targetRouter && targetRouter.isActive) {
          const { conn } = await PPPSecretService.connectToRouter(targetRouter);
          const active = await conn.execute('/ppp/active/print', [`?name=${customer.username}`], 6000);
          if (active && active.length > 0) {
            for (const a of active) {
              if (a['.id']) await conn.execute('/ppp/active/remove', [`=.id=${a['.id']}`], 6000);
            }
          }
          await conn.disconnect();
        }
      } catch (kickErr) {
        console.warn('[replace-device] Non-fatal MikroTik active session kick warning:', kickErr);
      }
    }

    const updatedAsset = await prisma.inventoryAsset.findFirst({ where: { id: newAsset.id } });

    return NextResponse.json({
      success: true,
      message: `Modem berhasil diganti ke SN ${cleanSN}`,
      newAsset: updatedAsset,
    });
  } catch (error: any) {
    console.error('POST replace-device error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengganti modem' }, { status: 500 });
  }
}
