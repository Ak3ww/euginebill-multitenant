import { NextRequest, NextResponse } from 'next/server';
import { TenantProvisioningService } from '@/server/services/saas/provisioning.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name || body.companyName;
    const slug = body.slug || body.subdomain;
    const email = body.email || body.adminEmail;
    const phone = body.phone || body.adminPhone;
    const password = body.password;
    const planCode = body.planCode || body.plan || 'starter';
    const customDomain = body.customDomain;

    // 1. Validation & Auto-Slug Generation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Nama lengkap minimal 2 karakter' },
        { status: 400 }
      );
    }

    let cleanSlug = (slug || '').toLowerCase().trim();
    if (!cleanSlug) {
      // Auto-generate from name or email
      const baseFromUser = (name || email?.split('@')[0] || 'tenant')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 14);
      const randSuffix = Math.random().toString(36).substring(2, 6);
      cleanSlug = `${baseFromUser || 'user'}-${randSuffix}`;
    }

    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(cleanSlug)) {
      cleanSlug = `tenant-${Math.random().toString(36).substring(2, 8)}`;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format alamat email tidak valid' },
        { status: 400 }
      );
    }

    if (!phone || phone.trim().length < 8) {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp aktif wajib diisi (minimal 8 digit)' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password SuperAdmin minimal 6 karakter' },
        { status: 400 }
      );
    }

    // 2. Call Tenant Provisioning Service
    const result = await TenantProvisioningService.createTenant({
      name: name.trim(),
      slug: cleanSlug,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      planCode: planCode.toLowerCase().trim(),
      password,
      customDomain: customDomain?.trim(),
      isDemo: false,
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
    console.error('[SaaS Register] Provisioning error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan sistem saat mendaftarkan tenant baru.',
      },
      { status: 400 }
    );
  }
}
