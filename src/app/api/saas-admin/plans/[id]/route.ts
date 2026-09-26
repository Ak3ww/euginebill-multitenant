import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

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
      code,
      priceMonthly,
      priceYearly,
      maxRouters,
      maxUsers,
      maxVouchers,
      features,
      isPopular,
      isActive,
    } = body;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toLowerCase().trim() }),
        ...(priceMonthly !== undefined && { priceMonthly: Number(priceMonthly) }),
        ...(priceYearly !== undefined && { priceYearly: Number(priceYearly) }),
        ...(maxRouters !== undefined && { maxRouters: Number(maxRouters) }),
        ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
        ...(maxVouchers !== undefined && { maxVouchers: Number(maxVouchers) }),
        ...(features !== undefined && { features }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Paket langganan berhasil diperbarui.',
      plan: updated,
    });
  } catch (err: any) {
    console.error('[SaaS Plan PUT Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui paket langganan.' },
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
    await prisma.subscriptionPlan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Paket langganan berhasil dihapus.',
    });
  } catch (err: any) {
    console.error('[SaaS Plan DELETE Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus paket langganan.' },
      { status: 500 }
    );
  }
}
