import { NextRequest, NextResponse } from 'next/server';
import { masterPrisma } from '@/server/db/tenant-manager';
import { TenantProvisioningService } from '@/server/services/saas/provisioning.service';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id.toLowerCase().trim() }],
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: `Tenant '${id}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    const result = await TenantProvisioningService.resetDemoTenant(tenant.slug);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[SaaS Reset Demo] Error resetting tenant:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mereset data demo tenant.',
      },
      { status: 500 }
    );
  }
}
