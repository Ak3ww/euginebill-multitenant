import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest, masterPrisma } from '@/server/db/tenant-manager';
import { verifyAuth } from '@/server/auth/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    const tenantSlug = getTenantFromRequest(req) || authUser?.tenantSlug;

    if (!tenantSlug) {
      // Fallback for single tenant or demo environment
      return NextResponse.json({
        success: true,
        data: {
          status: 'ACTIVE',
          planName: 'Enterprise SaaS',
          planCode: 'enterprise',
          isDemo: false,
          trialEndsAt: null,
          expiresAt: null,
          daysRemaining: 999,
          isExpired: false,
          isReadOnly: false,
          priceMonthly: 0,
        },
      });
    }

    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug.toLowerCase().trim() },
      include: {
        plan: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: `Tenant '${tenantSlug}' tidak ditemukan di database master.` },
        { status: 404 }
      );
    }

    const now = Date.now();
    const expiryDate = tenant.expiresAt || tenant.trialEndsAt;
    let daysRemaining = 0;
    let isExpired = false;

    if (expiryDate) {
      const expTime = new Date(expiryDate).getTime();
      const diffMs = expTime - now;
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = expTime < now || tenant.status === 'EXPIRED';
    }

    const isReadOnly = isExpired || tenant.status === 'SUSPENDED';

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        status: tenant.status,
        planName: tenant.plan?.name || 'Starter Plan',
        planCode: tenant.plan?.code || 'starter',
        priceMonthly: tenant.plan?.priceMonthly || 99000,
        maxRouters: tenant.plan?.maxRouters || 1,
        maxUsers: tenant.plan?.maxUsers || 100,
        isDemo: tenant.isDemo || tenant.status === 'DEMO',
        trialEndsAt: tenant.trialEndsAt,
        expiresAt: tenant.expiresAt,
        daysRemaining,
        isExpired,
        isReadOnly,
      },
    });
  } catch (error: any) {
    console.error('[Tenant Subscription Status] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat status langganan tenant.' },
      { status: 500 }
    );
  }
}
