import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const slug = searchParams.get('slug');

    if (!token) {
      return NextResponse.redirect(new URL('/saas-admin?error=invalid_token', req.url));
    }

    const impToken = await prisma.saaSImpersonationToken.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!impToken || impToken.usedAt || impToken.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/saas-admin?error=token_expired', req.url));
    }

    // Mark as consumed
    await prisma.saaSImpersonationToken.update({
      where: { id: impToken.id },
      data: { usedAt: new Date() },
    });

    // Target redirect
    const targetPath = `/admin?impersonate=true&tenant=${slug || impToken.tenant.slug}`;
    const redirectUrl = new URL(targetPath, req.url);

    const response = NextResponse.redirect(redirectUrl);
    // Set a lightweight impersonation indicator cookie
    response.cookies.set({
      name: 'euginebill_impersonating',
      value: impToken.tenant.slug,
      path: '/',
      maxAge: 3600, // 1 hour
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error('[Impersonate Error]', err);
    return NextResponse.redirect(new URL('/saas-admin?error=server_error', req.url));
  }
}
