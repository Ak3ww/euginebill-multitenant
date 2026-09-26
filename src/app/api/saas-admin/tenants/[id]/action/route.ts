import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

export async function POST(
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
    const { action, days, newStatus } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan.' }, { status: 404 });
    }

    // ----------------------------------------------------
    // Action 1: Impersonate SuperAdmin (1-time admin token)
    // ----------------------------------------------------
    if (action === 'impersonate') {
      const token = `imp_${crypto.randomBytes(24).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

      await prisma.saaSImpersonationToken.create({
        data: {
          token,
          tenantId: tenant.id,
          expiresAt,
        },
      });

      const impersonateUrl = `/api/auth/impersonate?token=${token}&slug=${tenant.slug}`;

      return NextResponse.json({
        success: true,
        message: `Token impersonasi untuk ${tenant.name} berhasil dibuat.`,
        token,
        impersonateUrl,
        expiresAt,
      });
    }

    // ----------------------------------------------------
    // Action 2: Extend Trial / Subscription (+7, +30, +365)
    // ----------------------------------------------------
    if (action === 'extend') {
      const extendDays = Number(days) || 30;
      const now = new Date();

      if (tenant.status === 'TRIAL') {
        const currentTrialEnd = tenant.trialEndsAt && tenant.trialEndsAt > now ? tenant.trialEndsAt : now;
        const newTrialEnd = new Date(currentTrialEnd.getTime() + extendDays * 24 * 3600 * 1000);

        const updated = await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            trialEndsAt: newTrialEnd,
            status: 'TRIAL',
          },
        });

        return NextResponse.json({
          success: true,
          message: `Masa Trial ${tenant.name} berhasil diperpanjang +${extendDays} hari (sampai ${newTrialEnd.toLocaleDateString('id-ID')}).`,
          tenant: updated,
        });
      } else {
        // ACTIVE or EXPIRED or SUSPENDED
        const currentEnd = tenant.expiresAt && tenant.expiresAt > now ? tenant.expiresAt : now;
        const newEnd = new Date(currentEnd.getTime() + extendDays * 24 * 3600 * 1000);

        const updated = await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            expiresAt: newEnd,
            status: 'ACTIVE',
          },
        });

        return NextResponse.json({
          success: true,
          message: `Langganan ${tenant.name} berhasil diperpanjang +${extendDays} hari (sampai ${newEnd.toLocaleDateString('id-ID')}).`,
          tenant: updated,
        });
      }
    }

    // ----------------------------------------------------
    // Action 3: Reset Data Demo (Untuk Tenant DEMO)
    // ----------------------------------------------------
    if (action === 'reset-demo') {
      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          totalRouters: 1,
          totalCustomers: 0,
          mrr: 0,
          notes: `[DEMO RESET: ${new Date().toLocaleString('id-ID')}] Data setup demo telah dikosongkan kembali ke 0%.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Data Demo untuk ${tenant.name} telah berhasil di-reset ke kondisi 0% setup.`,
        tenant: updated,
      });
    }

    // ----------------------------------------------------
    // Action 4: Toggle Status (SUSPENDED / ACTIVE)
    // ----------------------------------------------------
    if (action === 'toggle-status') {
      const targetStatus = newStatus || (tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED');

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          status: targetStatus,
        },
      });

      const label = targetStatus === 'ACTIVE' ? 'diaktifkan kembali' : 'ditangguhkan (SUSPENDED)';
      return NextResponse.json({
        success: true,
        message: `Status tenant ${tenant.name} berhasil ${label}.`,
        tenant: updated,
      });
    }

    return NextResponse.json({ error: `Aksi '${action}' tidak dikenali.` }, { status: 400 });
  } catch (err: any) {
    console.error('[SaaS Tenant Action Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses aksi tenant.' },
      { status: 500 }
    );
  }
}
