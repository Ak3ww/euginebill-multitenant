import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { checkAuth } from '@/server/middleware/api-auth';
import { detectOntVendorAndModel } from '@/lib/olt/ont-detector';

export const dynamic = 'force-dynamic';

// GET /api/admin/work-orders — List all work orders with filters
export async function GET(req: Request) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const technicianId = searchParams.get('technicianId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (technicianId) where.technicianId = technicianId;

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerAddress: { contains: search } },
        { description: { contains: search } },
        { issueType: { contains: search } },
      ];
    }

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          technician: {
            select: { id: true, name: true, phoneNumber: true, username: true },
          },
          customer: {
            select: { 
              id: true, 
              name: true, 
              username: true, 
              customerId: true,
              invoices: {
                select: { id: true, invoiceNumber: true, status: true },
              }
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workOrder.count({ where }),
    ]);

    const formattedWorkOrders = workOrders.map(wo => ({
      ...wo,
      hasInvoice: wo.customer?.invoices && wo.customer.invoices.length > 0,
    }));

    return NextResponse.json({
      success: true,
      workOrders: formattedWorkOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API Admin WorkOrders GET Error]:', error);
    return NextResponse.json({ error: 'Gagal mengambil data Surat Tugas' }, { status: 500 });
  }
}

// POST /api/admin/work-orders — Create a new Work Order (SPK)
export async function POST(req: Request) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const {
      linkedUserId,
      customerName,
      customerPhone,
      customerAddress,
      issueType = 'INSTALLATION',
      description,
      priority = 'MEDIUM',
      technicianId,
      scheduledDate,
      notes,
    } = body;

    if (!customerName || !customerPhone || !customerAddress) {
      return NextResponse.json(
        { error: 'Nama, telepon, dan alamat pelanggan wajib diisi' },
        { status: 400 }
      );
    }

    // Auto-resolve linkedUserId if not explicitly provided
    let finalLinkedUserId = linkedUserId || null;
    if (!finalLinkedUserId && (customerPhone || customerName)) {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const phoneVariations = cleanPhone ? [
        cleanPhone,
        '0' + cleanPhone.replace(/^62/, ''),
        '62' + cleanPhone.replace(/^0/, ''),
      ] : [];

      const matchedUser = await prisma.pppoeUser.findFirst({
        where: {
          OR: [
            ...(phoneVariations.length > 0 ? [{ phone: { in: phoneVariations } }] : []),
            { name: { equals: customerName.trim() } },
          ],
        },
        select: { id: true },
      });
      if (matchedUser) {
        finalLinkedUserId = matchedUser.id;
      }
    }

    // Query customer modem device from inventoryAssets, deviceHistories, oltOnuStatuses, and macAddress
    let foundSn: string | null = null;
    let foundMac: string | null = null;
    let foundModel: string | null = null;
    let foundAssetId: string | null = null;

    if (finalLinkedUserId) {
      try {
        // 1. Query perangkat modem pelanggan dari inventoryAssets (assetType: MODEM, order by updatedAt: desc)
        const modemAsset = await prisma.inventoryAsset.findFirst({
          where: {
            currentCustomerId: finalLinkedUserId,
            assetType: 'MODEM',
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (modemAsset) {
          foundSn = modemAsset.serialNumber || null;
          foundMac = modemAsset.macAddress || null;
          foundModel = modemAsset.model || modemAsset.vendor || null;
          foundAssetId = modemAsset.id;
        }

        // 2. Query deviceHistories (order by createdAt: desc) jika data perangkat belum lengkap
        if (!foundSn || !foundMac || !foundModel) {
          const deviceHistory = await prisma.customerDeviceHistory.findFirst({
            where: { customerId: finalLinkedUserId },
            orderBy: { createdAt: 'desc' },
          });

          if (deviceHistory) {
            foundSn = foundSn || deviceHistory.serialNumber || null;
            foundMac = foundMac || deviceHistory.macAddress || null;
            foundModel = foundModel || deviceHistory.model || deviceHistory.vendor || null;
            foundAssetId = foundAssetId || deviceHistory.assetId || null;
          }
        }

        // 3. Query oltOnuStatuses (order by updatedAt: desc) jika masih belum lengkap
        if (!foundSn || !foundMac) {
          const oltOnu = await prisma.oltOnuStatus.findFirst({
            where: { customerId: finalLinkedUserId },
            orderBy: { updatedAt: 'desc' },
          });

          if (oltOnu) {
            foundSn = foundSn || oltOnu.serialNumber || null;
            foundMac = foundMac || oltOnu.macAddress || null;
          }
        }

        // 4. Query customer macAddress dari pppoeUser
        if (!foundMac) {
          const customerRecord = await prisma.pppoeUser.findUnique({
            where: { id: finalLinkedUserId },
            select: { macAddress: true },
          });
          if (customerRecord?.macAddress) {
            foundMac = customerRecord.macAddress;
          }
        }

        // Auto-detect vendor & model jika foundSn ada tapi foundModel belum terisi
        if (foundSn && !foundModel) {
          const detected = detectOntVendorAndModel(foundSn);
          if (detected.model && detected.model !== 'Generic ONT') {
            foundModel = detected.model;
          } else if (detected.vendor && detected.vendor !== 'Generic') {
            foundModel = detected.vendor;
          }
        }

        // Jika foundSn ada tetapi foundAssetId belum terdeteksi, cari dari inventoryAsset
        if (foundSn && !foundAssetId) {
          const matchedAsset = await prisma.inventoryAsset.findFirst({
            where: {
              OR: [
                { serialNumber: foundSn },
                { serialNumber: foundSn.toUpperCase() },
              ],
            },
            select: { id: true },
          });
          if (matchedAsset) {
            foundAssetId = matchedAsset.id;
          }
        }
      } catch (deviceLookupErr) {
        console.error('[API Admin WorkOrders POST] Device lookup error:', deviceLookupErr);
      }
    }

    const initialReportData: any = body.reportData || {};
    const mergedReportData = {
      ...initialReportData,
      ...(foundSn ? { sn: foundSn } : {}),
      ...(foundMac ? { mac: foundMac } : {}),
      ...(foundModel ? { modemType: foundModel } : {}),
    };

    const status = technicianId ? 'ASSIGNED' : 'OPEN';

    const createData: any = {
      linkedUserId: finalLinkedUserId,
      customerName,
      customerPhone,
      customerAddress,
      issueType,
      description: description || `Pekerjaan ${issueType.replace('_', ' ')} untuk ${customerName}`,
      priority,
      status,
      technicianId: technicianId || null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      assignedAt: technicianId ? new Date() : null,
      notes: notes || null,
      ...(Object.keys(mergedReportData).length > 0 ? { reportData: mergedReportData } : {}),
      ...(foundAssetId ? { assignedAssets: { connect: { id: foundAssetId } } } : {}),
    };

    let newWorkOrder;
    try {
      newWorkOrder = await prisma.workOrder.create({
        data: createData,
        include: {
          technician: { select: { id: true, name: true, phoneNumber: true } },
          assignedAssets: true,
        },
      });
    } catch (createErr) {
      console.warn('[API Admin WorkOrders POST] Creation with assignedAssets failed, falling back without connect:', createErr);
      delete createData.assignedAssets;
      newWorkOrder = await prisma.workOrder.create({
        data: createData,
        include: {
          technician: { select: { id: true, name: true, phoneNumber: true } },
        },
      });
    }

    return NextResponse.json({
      success: true,
      workOrder: newWorkOrder,
      message: 'Surat Tugas (SPK) berhasil diterbitkan!',
    });
  } catch (error) {
    console.error('[API Admin WorkOrders POST Error]:', error);
    return NextResponse.json({ error: 'Gagal membuat Surat Tugas' }, { status: 500 });
  }
}
