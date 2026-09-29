import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSaaSSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      email,
      phone,
      planId,
      status,
      customDomain,
      notes,
      totalRouters,
      totalCustomers,
      mrr,
    } = body;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(planId !== undefined && { planId }),
        ...(status !== undefined && { status }),
        ...(customDomain !== undefined && { customDomain }),
        ...(notes !== undefined && { notes }),
        ...(totalRouters !== undefined && { totalRouters: Number(totalRouters) }),
        ...(totalCustomers !== undefined && { totalCustomers: Number(totalCustomers) }),
        ...(mrr !== undefined && { mrr: Number(mrr) }),
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data tenant berhasil diperbarui.',
      tenant: updated,
    });
  } catch (err: any) {
    console.error('[SaaS Tenant PUT Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui data tenant.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSaaSSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { TenantProvisioningService } = await import('@/server/services/saas/provisioning.service');
    const result = await TenantProvisioningService.deleteTenant(id, true);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[SaaS Tenant DELETE Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus tenant.' },
      { status: 500 }
    );
  }
}

