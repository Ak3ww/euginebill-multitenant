import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_SAMPLE_TENANTS = [
  {
    name: 'BinaNet Nusantara',
    slug: 'binanet',
    email: 'admin@binanet.id',
    phone: '081234567890',
    status: 'ACTIVE' as const,
    databaseName: 'euginebill_tenant_binanet',
    planCode: 'pro',
    totalRouters: 4,
    totalCustomers: 650,
    mrr: 499000,
    isDemo: false,
    notes: 'ISP Fiber Optic area Jabodetabek. 4 CCR MikroTik aktif.',
    expiresAt: new Date(Date.now() + 65 * 24 * 3600 * 1000),
    trialEndsAt: null,
  },
  {
    name: 'SpeedNet Fiber',
    slug: 'speednet',
    email: 'info@speednet.co.id',
    phone: '085678901234',
    status: 'TRIAL' as const,
    databaseName: 'euginebill_tenant_speednet',
    planCode: 'starter',
    totalRouters: 1,
    totalCustomers: 45,
    mrr: 0,
    isDemo: false,
    notes: 'Free Trial 7 Hari - ISP Baru daerah Jawa Barat.',
    trialEndsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    expiresAt: null,
  },
  {
    name: 'EugineBill Demo ISP',
    slug: 'demo',
    email: 'demo@euginebill.com',
    phone: '081122334455',
    status: 'DEMO' as const,
    databaseName: 'euginebill_tenant_demo',
    planCode: 'demo',
    totalRouters: 1,
    totalCustomers: 20,
    mrr: 0,
    isDemo: true,
    notes: 'Tenant Sandbox untuk presentasi klien & calon mitra.',
    trialEndsAt: null,
    expiresAt: null,
  },
  {
    name: 'Global Media Akses',
    slug: 'gma-net',
    email: 'noc@gmanet.net',
    phone: '081987654321',
    status: 'ACTIVE' as const,
    databaseName: 'euginebill_tenant_gmanet',
    planCode: 'enterprise',
    totalRouters: 12,
    totalCustomers: 3200,
    mrr: 1299000,
    isDemo: false,
    notes: 'Partner Enterprise - Full OLT + GenieACS TR-069 integration.',
    expiresAt: new Date(Date.now() + 190 * 24 * 3600 * 1000),
    trialEndsAt: null,
  },
  {
    name: 'Cahaya Mandiri Net',
    slug: 'cahayanet',
    email: 'finance@cahayanet.id',
    phone: '087711223344',
    status: 'SUSPENDED' as const,
    databaseName: 'euginebill_tenant_cahayanet',
    planCode: 'starter',
    totalRouters: 2,
    totalCustomers: 120,
    mrr: 199000,
    isDemo: false,
    notes: 'Tertunda pembayaran tagihan bulan berjalan.',
    expiresAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    trialEndsAt: null,
  },
];

async function ensureSampleTenants() {
  try {
    const tenantCount = await prisma.tenant.count();
    if (tenantCount === 0) {
      // Find plans
      const plans = await prisma.subscriptionPlan.findMany();
      const planMap = new Map(plans.map(p => [p.code, p.id]));

      for (const t of DEFAULT_SAMPLE_TENANTS) {
        const planId = planMap.get(t.planCode) || null;
        await prisma.tenant.create({
          data: {
            name: t.name,
            slug: t.slug,
            email: t.email,
            phone: t.phone,
            status: t.status,
            databaseName: t.databaseName,
            planId,
            totalRouters: t.totalRouters,
            totalCustomers: t.totalCustomers,
            mrr: t.mrr,
            isDemo: t.isDemo,
            notes: t.notes,
            expiresAt: t.expiresAt,
            trialEndsAt: t.trialEndsAt,
          },
        });
      }
    }
  } catch (err) {
    console.error('[SaaS Tenants] Error seeding sample tenants:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureSampleTenants();

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
  } catch (err) {
    console.error('[SaaS Tenants GET Error]', err);
    // Fallback data if DB is offline during build
    const fallbackTenants = DEFAULT_SAMPLE_TENANTS.map((t, idx) => ({
      id: `fallback-tenant-${idx + 1}`,
      ...t,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: {
        id: `plan-${t.planCode}`,
        name: t.planCode === 'starter' ? 'Starter ISP' : t.planCode === 'pro' ? 'Pro ISP' : t.planCode === 'enterprise' ? 'Enterprise ISP' : 'Demo Sandbox',
        code: t.planCode,
        priceMonthly: t.mrr,
        priceYearly: t.mrr * 10,
        maxRouters: t.totalRouters * 2,
        maxUsers: t.totalCustomers * 2,
      },
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants: fallbackTenants.length,
        activeTrials: fallbackTenants.filter(t => t.status === 'TRIAL').length,
        paidSubscriptions: fallbackTenants.filter(t => t.status === 'ACTIVE').length,
        totalMrr: fallbackTenants.reduce((acc, t) => acc + (t.status === 'ACTIVE' ? t.mrr : 0), 0),
        totalRouters: fallbackTenants.reduce((acc, t) => acc + t.totalRouters, 0),
        totalCustomers: fallbackTenants.reduce((acc, t) => acc + t.totalCustomers, 0),
      },
      tenants: fallbackTenants,
    });
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
