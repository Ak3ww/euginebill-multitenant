import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';
import { syncOnuToInventory } from '@/server/services/olt-inventory-sync.service';

export const dynamic = 'force-dynamic';

// GET /api/pppoe/users/[id]/device-history
export async function GET(
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

    // Verify user exists using flexible lookup (UUID, customerId, or username)
    const user = await prisma.pppoeUser.findFirst({
      where: {
        OR: [
          { id: rawId },
          { customerId: rawId },
          { username: rawId },
        ],
      },
      select: { id: true, name: true, username: true, macAddress: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 });
    }

    const customerId = user.id;

    const histories = await prisma.customerDeviceHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        asset: {
          select: { id: true, serialNumber: true, macAddress: true, vendor: true, model: true, status: true },
        },
      },
    });

    // Also get the current active asset (status = IN_USE, currentCustomerId = customerId)
    let currentAsset = await prisma.inventoryAsset.findFirst({
      where: { currentCustomerId: customerId, status: 'IN_USE', assetType: 'MODEM' },
      include: {
        item: { select: { sku: true, name: true } },
      },
    });

    // Self-healing step A: If no current asset, check if an OLT ONU is assigned or matches customer's MAC
    if (!currentAsset) {
      try {
        const onu = await prisma.oltOnuStatus.findFirst({
          where: {
            OR: [
              { customerId },
              ...(user.macAddress ? [{ macAddress: user.macAddress }] : []),
            ],
          },
          include: { olt: { select: { id: true, name: true, vendor: true } } },
        });

        if (onu && (onu.serialNumber || onu.macAddress)) {
          const cleanOnuSn = (onu.serialNumber || onu.macAddress || '').trim().toUpperCase();
          if (cleanOnuSn) {
            const syncRes = await syncOnuToInventory({
              serialNumber: cleanOnuSn,
              macAddress: onu.macAddress,
              customerId,
              oltVendor: onu.olt?.vendor,
              oltName: onu.olt?.name,
              location: `${onu.frame}/${onu.slot}/${onu.port}:${onu.onuId}`,
              description: onu.description,
              isOnline: onu.status === 'online',
              installedAt: onu.updatedAt,
            });

            if (syncRes) {
              currentAsset = await prisma.inventoryAsset.findUnique({
                where: { id: syncRes.assetId },
                include: { item: { select: { sku: true, name: true } } },
              });
            }
          }
        }
      } catch (onuSyncErr) {
        console.warn('OLT ONU fallback sync warning:', onuSyncErr);
      }
    }

    // Self-healing step B: if still no currentAsset, check completed workOrder reportData
    if (!currentAsset) {
      try {
        const userDetail = await prisma.pppoeUser.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            name: true,
            username: true,
            macAddress: true,
            workOrders: {
              where: { status: 'COMPLETED' },
              orderBy: { completedAt: 'desc' },
              take: 3,
              select: { id: true, issueType: true, reportData: true },
            },
          },
        });

        if (userDetail) {
          let candidateSn = '';
          let candidateMac = userDetail.macAddress ? userDetail.macAddress.trim().toUpperCase() : '';
          let candidateModel = '';
          let matchedWoId = '';

          for (const wo of userDetail.workOrders) {
            const rd = (wo.reportData || {}) as any;
            if (rd.sn) {
              candidateSn = String(rd.sn).trim().toUpperCase();
              if (rd.mac) candidateMac = String(rd.mac).trim().toUpperCase();
              if (rd.modemType) candidateModel = String(rd.modemType).trim();
              matchedWoId = wo.id;
              break;
            }
          }

          if (candidateSn) {
            // Check if asset already exists in inventory
            let foundAsset = await prisma.inventoryAsset.findFirst({
              where: {
                OR: [
                  { serialNumber: candidateSn },
                  ...(candidateMac ? [{ macAddress: candidateMac }] : []),
                ],
              },
              include: { item: { select: { sku: true, name: true } } },
            });

            if (foundAsset) {
              foundAsset = await prisma.inventoryAsset.update({
                where: { id: foundAsset.id },
                data: {
                  status: 'IN_USE',
                  currentCustomerId: customerId,
                  macAddress: candidateMac || foundAsset.macAddress,
                  installedAt: foundAsset.installedAt || new Date(),
                },
                include: { item: { select: { sku: true, name: true } } },
              });
              currentAsset = foundAsset;
            } else {
              // Auto-create catalog item & asset
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
                catalogItem = await prisma.inventoryItem.create({
                  data: {
                    sku: 'EMG-CPE-ONT-GENERIC',
                    name: 'Modem ONT GPON Standar',
                    categoryCode: 'CPE',
                    subCategory: 'ONT',
                    unit: 'pcs',
                    minimumStock: 5,
                    isSerialized: true,
                  },
                }).catch(() => null);
              }

              let vendor = 'Generic';
              let model = candidateModel || 'GPON ONT';
              if (candidateSn.startsWith('ZTEG')) { vendor = 'ZTE'; if (!candidateModel) model = 'ZTE F609 V3'; }
              else if (candidateSn.startsWith('SKYW')) { vendor = 'Skyworth'; if (!candidateModel) model = 'GN542VF'; }
              else if (candidateSn.startsWith('RTEG')) { vendor = 'Realtek'; if (!candidateModel) model = 'RTL8672 GPON'; }
              else if (candidateSn.startsWith('YHTC')) { vendor = 'Yuhua'; if (!candidateModel) model = 'YH-100G'; }
              else if (candidateSn.startsWith('FHTT')) { vendor = 'FiberHome'; if (!candidateModel) model = 'HG6243C'; }
              else if (candidateSn.startsWith('HWTC')) { vendor = 'Huawei'; if (!candidateModel) model = 'HG8245H'; }
              else if (candidateSn.startsWith('AZVG')) { vendor = 'VSOL'; if (!candidateModel) model = 'V2801 Series'; }

              if (catalogItem) {
                const created = await prisma.inventoryAsset.create({
                  data: {
                    itemId: catalogItem.id,
                    assetType: 'MODEM',
                    serialNumber: candidateSn,
                    macAddress: candidateMac || null,
                    vendor,
                    model,
                    condition: 'NEW',
                    status: 'IN_USE',
                    currentCustomerId: customerId,
                    installedAt: new Date(),
                    notes: `Self-healed dari SPK #${matchedWoId}`,
                  },
                  include: { item: { select: { sku: true, name: true } } },
                });
                currentAsset = created;

                await prisma.customerDeviceHistory.create({
                  data: {
                    customerId,
                    assetId: created.id,
                    serialNumber: candidateSn,
                    vendor,
                    model,
                    macAddress: candidateMac || null,
                    action: 'INSTALLED',
                    reason: `Sinkronisasi Otomatis SPK #${matchedWoId}`,
                    workOrderId: matchedWoId || undefined,
                    installedAt: new Date(),
                    technicianName: 'Sistem Inventori',
                  },
                }).catch(() => {});
              }
            }
          }
        }
      } catch (healErr) {
        console.warn('Self-healing device history error:', healErr);
      }
    }

    return NextResponse.json({ success: true, histories, currentAsset });
  } catch (error: any) {
    console.error('GET device-history error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil riwayat perangkat' }, { status: 500 });
  }
}
