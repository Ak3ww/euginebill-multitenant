import { NextRequest, NextResponse } from 'next/server';
import { masterPrisma } from '@/server/db/tenant-manager';
import { TenantProvisioningService } from '@/server/services/saas/provisioning.service';
import { TenantStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.toUpperCase() as TenantStatus | undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'DEMO'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { customDomain: { contains: search } },
      ];
    }

    const [total, tenants] = await Promise.all([
      masterPrisma.tenant.count({ where }),
      masterPrisma.tenant.findMany({
        where,
        include: {
          plan: true,
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: true },
          },
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Summary statistics for dashboard cards
    const [totalActive, totalTrial, totalSuspended, totalDemo] = await Promise.all([
      masterPrisma.tenant.count({ where: { status: 'ACTIVE' } }),
      masterPrisma.tenant.count({ where: { status: 'TRIAL' } }),
      masterPrisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      masterPrisma.tenant.count({ where: { status: 'DEMO' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        active: totalActive,
        trial: totalTrial,
        suspended: totalSuspended,
        demo: totalDemo,
      },
    });
  } catch (error: any) {
    console.error('[SaaS Tenants List] Error fetching tenants:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil daftar tenant SaaS.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, email, phone, planCode = 'starter', password, customDomain, isDemo = false } = body;

    if (!name || !slug || !email) {
      return NextResponse.json(
        { success: false, message: 'Nama, slug, dan email tenant wajib diisi' },
        { status: 400 }
      );
    }

    const result = await TenantProvisioningService.createTenant({
      name,
      slug,
      email,
      phone,
      planCode,
      password,
      customDomain,
      isDemo: Boolean(isDemo),
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[SaaS Tenants Create] Error creating tenant:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal membuat tenant baru.',
      },
      { status: 400 }
    );
  }
}
