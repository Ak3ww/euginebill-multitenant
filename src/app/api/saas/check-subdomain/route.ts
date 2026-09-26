import { NextRequest, NextResponse } from 'next/server';
import { masterPrisma } from '@/server/db/tenant-manager';

const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'billing',
  'cdn',
  'corp',
  'customer',
  'dashboard',
  'demo',
  'dev',
  'docs',
  'euginebill',
  'help',
  'login',
  'mail',
  'master',
  'mgmt',
  'panel',
  'pay',
  'payment',
  'portal',
  'radius',
  'root',
  'router',
  'saas',
  'server',
  'setup',
  'status',
  'support',
  'system',
  'technician',
  'test',
  'vpn',
  'wa',
  'web',
  'webhook',
  'www',
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    if (!slug) {
      return NextResponse.json(
        { available: false, message: 'Subdomain wajib diisi' },
        { status: 400 }
      );
    }

    // Validation: 3-30 alphanumeric and hyphens, cannot start or end with hyphen
    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          available: false,
          message: 'Format subdomain tidak valid. Gunakan 3-30 karakter huruf kecil, angka, atau tanda strip (-)',
        },
        { status: 200 }
      );
    }

    if (RESERVED_SUBDOMAINS.has(slug)) {
      return NextResponse.json(
        {
          available: false,
          message: 'Subdomain ini dicadangkan untuk sistem internal. Silakan pilih subdomain lain.',
        },
        { status: 200 }
      );
    }

    // Check database if tenant slug exists
    const existingTenant = await masterPrisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (existingTenant) {
      return NextResponse.json(
        {
          available: false,
          message: `Subdomain '${slug}' sudah terdaftar. Silakan gunakan nama lain.`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        available: true,
        slug,
        message: `Subdomain ${slug}.euginebill.com tersedia!`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    return NextResponse.json(
      { available: false, message: 'Gagal memeriksa ketersediaan subdomain' },
      { status: 500 }
    );
  }
}
