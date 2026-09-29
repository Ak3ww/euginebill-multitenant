import { NextRequest, NextResponse } from 'next/server';
import { masterPrisma, getTenantPrisma } from '@/server/db/tenant-manager';
import { TenantProvisioningService } from '@/server/services/saas/provisioning.service';
import { TenantStatus } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id.toLowerCase().trim() }],
      },
      include: {
        plan: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: `Tenant '${id}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    // Inspect Tenant Database Health & Operational Counts
    let dbStatus = 'CONNECTED';
    let counts = {
      routers: 0,
      pppoeUsers: 0,
      hotspotUsers: 0,
      vouchers: 0,
      invoices: 0,
    };

    try {
      const tenantPrisma = getTenantPrisma(tenant.slug);
      const [rCount, pCount, uCount, vCount, iCount] = await Promise.all([
        tenantPrisma.router.count().catch(() => 0),
        tenantPrisma.pppoeUser.count().catch(() => 0),
        tenantPrisma.users.count().catch(() => 0),
        tenantPrisma.hotspotVoucher.count().catch(() => 0),
        tenantPrisma.invoice.count().catch(() => 0),
      ]);
      counts = {
        routers: rCount,
        pppoeUsers: pCount,
        hotspotUsers: uCount,
        vouchers: vCount,
        invoices: iCount,
      };
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    return NextResponse.json({
      success: true,
      data: {
        ...tenant,
        dbStatus,
        operationalCounts: counts,
      },
    });
  } catch (error: any) {
    console.error('[SaaS Tenant Detail] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil detail tenant.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      email,
      phone,
      status,
      planId,
      customDomain,
      trialEndsAt,
      expiresAt,
    } = body;

    const existingTenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id.toLowerCase().trim() }],
      },
    });

    if (!existingTenant) {
      return NextResponse.json(
        { success: false, message: `Tenant '${id}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (status !== undefined) {
      const validStatuses: TenantStatus[] = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'DEMO'];
      if (validStatuses.includes(status)) {
        updateData.status = status;
      }
    }
    if (planId !== undefined) updateData.planId = planId || null;
    if (customDomain !== undefined) updateData.customDomain = customDomain ? customDomain.toLowerCase().trim() : null;
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updated = await masterPrisma.tenant.update({
      where: { id: existingTenant.id },
      data: updateData,
      include: {
        plan: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data tenant '${updated.name}' berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('[SaaS Tenant Update] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memperbarui data tenant.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const dropDatabase = searchParams.get('dropDatabase') !== 'false';

    const result = await TenantProvisioningService.deleteTenant(id, dropDatabase);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[SaaS Tenant Delete] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal menghapus tenant.',
      },
      { status: 400 }
    );
  }
}
