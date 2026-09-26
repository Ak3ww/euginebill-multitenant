import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getSaaSSession } from '@/server/auth/saas-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_PLANS = [
  {
    name: 'Starter ISP',
    code: 'starter',
    priceMonthly: 199000,
    priceYearly: 1990000,
    maxRouters: 1,
    maxUsers: 250,
    maxVouchers: 1000,
    isPopular: false,
    isActive: true,
    features: [
      '1 MikroTik Router Sync',
      'Maksimal 250 Pelanggan PPPoE',
      '1.000 Voucher Hotspot / bln',
      'WhatsApp Gateway (Fonnte/Wablas)',
      'Isolasi Otomatis & Reminder WA',
      'Payment Gateway QRIS & VA',
    ],
  },
  {
    name: 'Pro ISP',
    code: 'pro',
    priceMonthly: 499000,
    priceYearly: 4990000,
    maxRouters: 5,
    maxUsers: 1500,
    maxVouchers: 5000,
    isPopular: true,
    isActive: true,
    features: [
      'Hingga 5 MikroTik Routers',
      'Maksimal 1.500 Pelanggan PPPoE',
      '5.000 Voucher Hotspot / bln',
      'GenieACS Auto Provisioning ONT',
      'OLT VSOL / EPON / GPON Sync',
      'Auto WhatsApp Broadcast & Billing',
      'Multi-Staff & Technician App',
    ],
  },
  {
    name: 'Enterprise ISP',
    code: 'enterprise',
    priceMonthly: 1299000,
    priceYearly: 12990000,
    maxRouters: 20,
    maxUsers: 10000,
    maxVouchers: 50000,
    isPopular: false,
    isActive: true,
    features: [
      'Hingga 20 MikroTik Routers',
      'Maksimal 10.000 Pelanggan',
      'Unlimited Voucher Hotspot',
      'GenieACS + TR-069 Unlimited ONT',
      'Dedicated Custom Domain & SSL',
      'VIP Priority Support 24/7',
      'Custom Database Backup & Server VPS',
    ],
  },
  {
    name: 'Demo Sandbox',
    code: 'demo',
    priceMonthly: 0,
    priceYearly: 0,
    maxRouters: 1,
    maxUsers: 50,
    maxVouchers: 100,
    isPopular: false,
    isActive: true,
    features: [
      '1 Demo Virtual Router',
      'Maksimal 50 Dummy Pelanggan',
      '100 Voucher Hotspot Demo',
      'Akses Penuh Fitur Dashboard',
      'Tombol Reset Data Sekali Klik',
    ],
  },
];

async function ensureDefaultPlans() {
  try {
    const count = await prisma.subscriptionPlan.count();
    if (count === 0) {
      for (const p of DEFAULT_PLANS) {
        await prisma.subscriptionPlan.create({
          data: {
            name: p.name,
            code: p.code,
            priceMonthly: p.priceMonthly,
            priceYearly: p.priceYearly,
            maxRouters: p.maxRouters,
            maxUsers: p.maxUsers,
            maxVouchers: p.maxVouchers,
            isPopular: p.isPopular,
            isActive: p.isActive,
            features: p.features,
          },
        });
      }
    }
  } catch (err) {
    console.error('[SaaS Plans] Error seeding default plans:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultPlans();

    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { tenants: true },
        },
      },
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (err) {
    console.error('[SaaS Plans GET Error]', err);
    // Return fallback plans if DB is unreachable
    return NextResponse.json({
      success: true,
      plans: DEFAULT_PLANS.map((p, idx) => ({
        id: `plan-default-${idx + 1}`,
        ...p,
        _count: { tenants: idx === 1 ? 8 : 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
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

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nama dan kode paket wajib diisi.' },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        code: code.toLowerCase().trim(),
        priceMonthly: Number(priceMonthly) || 0,
        priceYearly: Number(priceYearly) || 0,
        maxRouters: Number(maxRouters) || 1,
        maxUsers: Number(maxUsers) || 100,
        maxVouchers: Number(maxVouchers) || 500,
        features: Array.isArray(features) ? features : [],
        isPopular: Boolean(isPopular),
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Paket langganan berhasil dibuat.',
      plan,
    });
  } catch (err: any) {
    console.error('[SaaS Plan Create Error]', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membuat paket langganan.' },
      { status: 500 }
    );
  }
}
