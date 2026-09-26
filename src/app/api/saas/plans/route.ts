import { NextRequest, NextResponse } from 'next/server';
import { masterPrisma } from '@/server/db/tenant-manager';

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    code: 'starter',
    priceMonthly: 150000,
    priceYearly: 1500000,
    maxRouters: 1,
    maxUsers: 150,
    maxVouchers: 500,
    isPopular: false,
    isActive: true,
    features: [
      '1 MikroTik Router / NAS',
      'Hingga 150 Pelanggan Aktif',
      '500 Voucher Hotspot / Bulan',
      'PPPoE & Hotspot Server',
      'Auto Isolir & Reminder WA',
      'Export Laporan PDF & Excel',
    ],
  },
  {
    name: 'Pro',
    code: 'pro',
    priceMonthly: 350000,
    priceYearly: 3500000,
    maxRouters: 5,
    maxUsers: 1000,
    maxVouchers: 5000,
    isPopular: true,
    isActive: true,
    features: [
      '5 MikroTik Router / Multi-POP',
      'Hingga 1,000 Pelanggan Aktif',
      '5,000 Voucher Hotspot / Bulan',
      'GenieACS TR-069 Auto-Provisioning',
      'Auto Isolir & Multi Gateway WA',
      'PWA Mobile Portal Pelanggan & Teknisi',
      'Backup Cloud Harian Otomatis',
    ],
  },
  {
    name: 'Enterprise',
    code: 'enterprise',
    priceMonthly: 750000,
    priceYearly: 7500000,
    maxRouters: 25,
    maxUsers: 5000,
    maxVouchers: 25000,
    isPopular: false,
    isActive: true,
    features: [
      '25+ MikroTik Router & OLT VSOL',
      'Hingga 5,000 Pelanggan Aktif',
      '25,000 Voucher Hotspot / Bulan',
      'Dedicated ONT Remote Proxy',
      'Custom Domain Sendiri (SSL)',
      'Akses Multi-Cabang & Gudang Material',
      'Prioritas SLA 99.9% & Dedicated Support',
    ],
  },
  {
    name: 'Demo Sandbox',
    code: 'demo',
    priceMonthly: 0,
    priceYearly: 0,
    maxRouters: 2,
    maxUsers: 50,
    maxVouchers: 200,
    isPopular: false,
    isActive: true,
    features: [
      'Fitur Lengkap Pro Sandbox',
      '1-Click Reset Demo State',
      '2 Router Demo',
      'Uji Coba & Evaluasi Bebas',
    ],
  },
];

export async function GET() {
  try {
    let plans = await masterPrisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });

    // Auto-seed default plans if database is currently empty
    if (plans.length === 0) {
      for (const p of DEFAULT_PLANS) {
        await masterPrisma.subscriptionPlan.upsert({
          where: { code: p.code },
          create: p,
          update: p,
        });
      }

      plans = await masterPrisma.subscriptionPlan.findMany({
        orderBy: { priceMonthly: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error('[SaaS Plans] Error fetching plans:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil data paket langganan SaaS.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      priceMonthly = 0,
      priceYearly = 0,
      maxRouters = 1,
      maxUsers = 100,
      maxVouchers = 500,
      features,
      isPopular = false,
      isActive = true,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: 'Nama dan kode paket wajib diisi' },
        { status: 400 }
      );
    }

    const cleanCode = code.toLowerCase().trim();

    const plan = await masterPrisma.subscriptionPlan.upsert({
      where: { code: cleanCode },
      create: {
        name: name.trim(),
        code: cleanCode,
        priceMonthly: Number(priceMonthly),
        priceYearly: Number(priceYearly),
        maxRouters: Number(maxRouters),
        maxUsers: Number(maxUsers),
        maxVouchers: Number(maxVouchers),
        features: features || [],
        isPopular: Boolean(isPopular),
        isActive: Boolean(isActive),
      },
      update: {
        name: name.trim(),
        priceMonthly: Number(priceMonthly),
        priceYearly: Number(priceYearly),
        maxRouters: Number(maxRouters),
        maxUsers: Number(maxUsers),
        maxVouchers: Number(maxVouchers),
        features: features || [],
        isPopular: Boolean(isPopular),
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Paket '${plan.name}' berhasil disimpan.`,
        data: plan,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[SaaS Plans] Error creating/updating plan:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal menyimpan paket langganan.',
      },
      { status: 400 }
    );
  }
}
