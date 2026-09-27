import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where: whereClause,
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute Summary Stats across ALL tenants
    const allTenants = await prisma.tenant.findMany({
      include: { plan: true },
    });

    const totalTenants = allTenants.length;
    const activeTrials = allTenants.filter(t => t.status === 'TRIAL').length;
    const paidSubscriptions = allTenants.filter(t => t.status === 'ACTIVE').length;
    const totalMrr = allTenants.reduce((acc, t) => acc + (t.status === 'ACTIVE' ? (t.plan?.priceMonthly || t.mrr || 0) : 0), 0);
    const totalRouters = allTenants.reduce((acc, t) => acc + (t.totalRouters || 1), 0);
    const totalCustomers = allTenants.reduce((acc, t) => acc + (t.totalCustomers || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants,
        activeTrials,
        paidSubscriptions,
        totalMrr,
        totalRouters,
        totalCustomers,
      },
      tenants,
    });
  } catch (err: any) {
    console.error('[SaaS Tenants GET Error]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal memuat data tenant',
      stats: {
        totalTenants: 0,
        activeTrials: 0,
        paidSubscriptions: 0,
        totalMrr: 0,
        totalRouters: 0,
        totalCustomers: 0,
      },
      tenants: [],
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSaaSSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      email,
      phone,
      planId,
      status = 'TRIAL',
      trialDays = 7,
      isDemo = false,
      notes,
    } = body;

    if (!name || !slug || !email) {
      return NextResponse.json(
        { error: 'Nama ISP, Subdomain Slug, dan Email wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    // Check unique slug
    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Subdomain slug '${cleanSlug}' sudah digunakan oleh tenant lain.` },
        { status: 400 }
      );
    }

    const trialEndsAt = status === 'TRIAL'
      ? new Date(Date.now() + Number(trialDays) * 24 * 3600 * 1000)
      : null;

    const expiresAt = status === 'ACTIVE'
      ? new Date(Date.now() + 30 * 24 * 3600 * 1000)
      : null;

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: cleanSlug,
        email: email.trim().toLowerCase(),
        phone: phone || null,
        status: status as any,
        databaseName: `euginebill_tenant_${cleanSlug.replace(/-/g, '_')}`,
        planId: planId || null,
        trialEndsAt,
        expiresAt,
        isDemo: Boolean(isDemo),
        notes: notes || null,
        totalRouters: 1,
        totalCustomers: 0,
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tenant '${tenant.name}' berhasil didaftarkan.`,
      tenant,
    });
  } catch (err: any) {
    console.error('[SaaS Tenant Create Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mendaftarkan tenant baru.' },
      { status: 500 }
    );
  }
}
