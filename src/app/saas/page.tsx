'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Server,
  Wifi,
  MessageSquare,
  Printer,
  Radio,
  CreditCard,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Database,
  RotateCcw,
  Building2,
  Globe,
  CheckCircle2,
  Layers,
  HelpCircle,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  Users,
  Cpu,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Type definitions
type PlanType = 'starter' | 'pro' | 'enterprise';
type BillingCycle = 'monthly' | 'yearly';

interface PlanDetail {
  id: PlanType;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyMonthlyEquivalent: number;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
}

const PLANS: PlanDetail[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Ideal untuk pengusaha RT/RW Net pemula yang baru merintis billing otomatis.',
    monthlyPrice: 99000,
    yearlyMonthlyEquivalent: 79200,
    features: [
      '1 Router MikroTik Terhubung',
      'Hingga 100 Pelanggan PPPoE',
      '500 Voucher Hotspot / Bulan',
      'WhatsApp Bot Notifikasi Tagihan H-3, H-1, H+0',
      'Sistem Isolasi Pelanggan Otomatis (CoA)',
      'Laporan Finansial & Mutasi Dasar',
      'Dukungan Komunitas & Update Rutin',
    ],
    ctaLabel: 'Mulai Trial 7 Hari (Gratis)',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Pilihan terfavorit untuk ISP berkembang & RT/RW Net skala menengah.',
    monthlyPrice: 249000,
    yearlyMonthlyEquivalent: 199200,
    isPopular: true,
    features: [
      '5 Router MikroTik Terhubung',
      'Hingga 1.000 Pelanggan PPPoE',
      'Unlimited Voucher Hotspot',
      'WhatsApp Bot Interaktif (Kirim Invoice PDF & CS)',
      'TR-069 & GenieACS Remote ONT Management',
      'Multi-Admin & Hak Akses Teknisi (PSB/SPK Lapangan)',
      'Payment Gateway QRIS & Virtual Account Otomatis',
      'Backup Otomatis Harian ke Telegram / Cloud',
    ],
    ctaLabel: 'Mulai Trial 7 Hari (Gratis)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Arsitektur skala besar untuk WISP regional dan ISP fiber optic profesional.',
    monthlyPrice: 499000,
    yearlyMonthlyEquivalent: 399200,
    features: [
      'Unlimited Router MikroTik',
      'Unlimited Pelanggan PPPoE & Hotspot',
      'Dedicated VPN Server & Dedicated IP Publik',
      'Custom Domain & Branding Mandiri (portal.ispanda.com)',
      'TR-069 ACS Cluster Skala Besar & Telemetry Optik',
      'Integrasi OLT VSOL, ZTE, Huawei & Fiberhome',
      'Prioritas Dukungan Teknis 24/7 & SLA 99.9%',
    ],
    ctaLabel: 'Mulai Trial 7 Hari (Gratis)',
  },
];

const FEATURES_GRID = [
  {
    icon: Server,
    title: 'Native MikroTik API & Dynamic Ports',
    desc: 'Integrasi langsung dengan RouterOS v6 & v7 via secure VPN tunnel proxy. Mendukung akses remote Winbox, API socket, dan WebFig tanpa IP publik statis.',
  },
  {
    icon: Zap,
    title: 'FreeRADIUS 3.x High-Performance',
    desc: 'Engine autentikasi AAA performa tinggi berskala puluhan ribu sesi simultan. Dilengkapi CoA Disconnect untuk eksekusi isolasi dan aktivasi instan tanpa reboot.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Bot Billing Otomatis',
    desc: 'Kirim notifikasi tagihan H-3, H-1, H+0 secara otomatis dengan lampiran file PDF invoice resmi. Dilengkapi bot verifikasi pembayaran dan laporan harian ke owner.',
  },
  {
    icon: Printer,
    title: 'Cetak Voucher Hotspot Kilat',
    desc: 'Generator ribuan voucher hotspot instan dengan layout custom logo, QR code scan otomatis tanpa ketik sandi, dan format cetak kertas thermal 58mm/80mm maupun A4.',
  },
  {
    icon: Radio,
    title: 'TR-069 & GenieACS ONT Management',
    desc: 'Auto provisioning ONT pelanggan (ZTE, Huawei, Fiberhome, VSOL). Pantau redaman RX/TX optical power real-time, reboot perangkat, serta ganti SSID/password jarak jauh.',
  },
  {
    icon: CreditCard,
    title: 'Integrasi Payment Gateway Lengkap',
    desc: 'Mendukung QRIS instan, Virtual Account Bank (BCA, Mandiri, BRI, BNI), dan gerai Alfamart/Indomaret via Duitku, Midtrans, Tripay, dan Xendit dengan rekonsiliasi otomatis.',
  },
];

const SECURITY_BADGES = [
  {
    icon: Database,
    title: '100% Data Terisolasi',
    desc: 'Setiap tenant memiliki database mandiri terpisah untuk menjamin privasi data pelanggan.',
  },
  {
    icon: Activity,
    title: 'SLA Uptime 99.99%',
    desc: 'Arsitektur cloud terdistribusi dengan pemantauan otomatis 24/7 dan failover zero-downtime.',
  },
  {
    icon: Lock,
    title: 'Enkripsi Bank-Grade',
    desc: 'Komunikasi data diamankan dengan TLS/SSL 256-bit dan proteksi kredensial router terenkripsi.',
  },
  {
    icon: RotateCcw,
    title: 'Pencadangan Otomatis',
    desc: 'Pencadangan basis data harian otomatis ke cloud multi-region dan notifikasi via bot Telegram.',
  },
];

const FAQS = [
  {
    q: 'Bagaimana cara kerja Trial Gratis 7 Hari?',
    a: 'Anda mendapatkan akses penuh tanpa batasan fitur selama 7 hari ke paket yang Anda pilih. Tanpa perlu kartu kredit atau deposit. Setelah mendaftar, sistem akan otomatis menyiapkan instance database dan subdomain khusus untuk ISP Anda.',
  },
  {
    q: 'Apakah saya membutuhkan IP Publik Statis di MikroTik saya?',
    a: 'Tidak. EugineBill menyediakan VPN Server terintegrasi. MikroTik Anda cukup terkoneksi ke internet dan menjalankan script koneksi VPN client kami untuk terhubung secara aman dengan cloud billing.',
  },
  {
    q: 'Apakah bisa digunakan untuk router MikroTik RouterOS v6 dan v7?',
    a: 'Ya, sistem kami mendukung penuh RouterOS versi 6.x hingga 7.x terbaru, baik mode API port standar maupun FreeRADIUS AAA.',
  },
  {
    q: 'Bagaimana cara integrasi WhatsApp Bot?',
    a: 'Kami menyediakan service WhatsApp Baileys bawaan yang dapat langsung dihubungkan via scan QR Code dari nomor WhatsApp resmi Anda, atau menggunakan gateway API pihak ketiga yang Anda miliki.',
  },
  {
    q: 'Apakah data pelanggan saya aman jika menggunakan layanan cloud?',
    a: 'Sangat aman. EugineBill menerapkan isolasi database per-tenant (database terpisah untuk setiap ISP), enkripsi kata sandi standar industri, dan pencadangan harian otomatis.',
  },
  {
    q: 'Dapatkah saya upgrade atau downgrade paket setelah masa trial?',
    a: 'Tentu saja. Anda dapat mengubah paket langganan kapan saja melalui panel admin tanpa kehilangan data konfigurasi maupun histori transaksi.',
  },
];

const PROVISIONING_STEPS = [
  'Memvalidasi data pendaftaran & ketersediaan subdomain...',
  'Menyiapkan cluster database terisolasi tenant...',
  'Menginisialisasi skema billing, RADIUS engine & tabel router...',
  'Mengonfigurasi layanan WhatsApp Bot & webhook gateway...',
  'Instansiasi selesai! Mengalihkan ke Halaman Setup...',
];

export default function SaasLandingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Subdomain Validation State
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [subdomainMessage, setSubdomainMessage] = useState('');

  // Submission & Provisioning Simulation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successRedirectUrl, setSuccessRedirectUrl] = useState('');

  // Format IDR Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Open Modal with specific plan
  const handleOpenRegister = (planId: PlanType = 'pro') => {
    setSelectedPlan(planId);
    setErrorMessage('');
    setIsRegisterOpen(true);
  };

  // Debounced Subdomain Check
  useEffect(() => {
    const cleanSlug = subdomain.trim().toLowerCase();
    if (!cleanSlug) {
      setSubdomainStatus('idle');
      setSubdomainMessage('');
      return;
    }

    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(cleanSlug)) {
      setSubdomainStatus('unavailable');
      setSubdomainMessage('Gunakan 3-30 karakter huruf kecil, angka, atau strip (-)');
      return;
    }

    setSubdomainStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/saas/check-subdomain?slug=${encodeURIComponent(cleanSlug)}`);
        const data = await res.json();
        if (data.available) {
          setSubdomainStatus('available');
          setSubdomainMessage(`${cleanSlug}.euginemediagroup.site tersedia!`);
        } else {
          setSubdomainStatus('unavailable');
          setSubdomainMessage(data.message || 'Subdomain tidak tersedia');
        }
      } catch (err) {
        setSubdomainStatus('idle');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [subdomain]);

  // Handle Form Submit & Step-by-Step Progress
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!companyName.trim()) {
      setErrorMessage('Nama ISP / Perusahaan wajib diisi.');
      return;
    }
    if (!subdomain.trim() || subdomainStatus === 'unavailable') {
      setErrorMessage('Silakan pilih subdomain yang valid dan tersedia.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Email penanggung jawab wajib diisi.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Nomor WhatsApp wajib diisi untuk pengiriman kredensial.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password SuperAdmin minimal 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    setCurrentStepIndex(0);

    try {
      // Step 1: Call API
      const res = await fetch('/api/saas/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          subdomain: subdomain.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          plan: selectedPlan,
          billingCycle,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setIsSubmitting(false);
        setErrorMessage(result.message || 'Pendaftaran gagal. Silakan periksa kembali form Anda.');
        return;
      }

      // Progress animation sequence
      for (let i = 1; i < PROVISIONING_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 850));
        setCurrentStepIndex(i);
      }

      const redirectTarget = result.data?.redirectUrl || `/setup?tenant=${encodeURIComponent(subdomain.trim().toLowerCase())}`;
      setSuccessRedirectUrl(redirectTarget);

      // Short delay before actual redirection
      setTimeout(() => {
        window.location.href = redirectTarget;
      }, 1200);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage('Terjadi gangguan jaringan saat memproses pendaftaran. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9fe] text-[#1a1c20] antialiased selection:bg-[#1b437c] selection:text-white">
      {/* Top Notification Announcement Bar */}
      <div className="bg-[#002c60] text-white text-xs sm:text-sm py-2 px-4 text-center border-b border-[#1b437c] flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
        <span>
          <strong>Rilis v2.40:</strong> Integrasi TR-069 GenieACS Multi-Vendor & Generator QRIS Dinamis Otomatis kini tersedia!
        </span>
        <button
          onClick={() => handleOpenRegister('pro')}
          className="underline font-semibold hover:text-sky-200 transition-colors ml-1 hidden sm:inline"
        >
          Coba Gratis Sekarang
        </button>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/saas" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c60] to-[#1b437c] flex items-center justify-center text-white shadow-md shadow-blue-950/15 group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="font-bold text-lg sm:text-xl tracking-tight text-[#002c60] flex items-center gap-1.5">
                <span>EugineBill</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#1b437c] font-medium border border-blue-200">
                  Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">ISP & RT-RW Net Billing Management</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#fitur" className="hover:text-[#002c60] transition-colors">
              Fitur Utama
            </a>
            <a href="#harga" className="hover:text-[#002c60] transition-colors">
              Paket & Harga
            </a>
            <a href="#keamanan" className="hover:text-[#002c60] transition-colors">
              Arsitektur & Keamanan
            </a>
            <a href="#faq" className="hover:text-[#002c60] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/customer/login" className="hidden sm:inline-flex">
              <Button variant="ghost" className="text-slate-600 hover:text-[#002c60] text-sm">
                Login Portal
              </Button>
            </Link>
            <Button
              onClick={() => handleOpenRegister('pro')}
              className="bg-[#002c60] hover:bg-[#1b437c] text-white shadow-sm font-medium px-4 sm:px-5"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Coba Gratis 7 Hari</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-[#f9f9fe]">
        <div className="absolute inset-0 bg-[radial-gradient(#1b437c_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Version Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/80 text-[#002c60] text-xs sm:text-sm font-semibold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#1b437c]" />
              <span>Cloud ISP & RT-RW Net Billing Platform v2.40</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#002c60] tracking-tight leading-[1.15] text-balance">
              Sistem Billing & Network Management ISP / RT-RW Net Berbasis Cloud
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed text-pretty">
              Kelola router MikroTik tak terbatas, isolasi pelanggan otomatis, WhatsApp Bot Billing, FreeRADIUS 3, TR-069
              ACS ONT, dan pembayaran QRIS dalam satu platform terpadu.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button
                size="lg"
                onClick={() => handleOpenRegister('pro')}
                className="w-full sm:w-auto bg-[#002c60] hover:bg-[#1b437c] text-white font-semibold px-8 py-6 text-base shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                <span>Coba Gratis 7 Hari</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link href="/admin/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-6 text-base"
                >
                  <Server className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Buka Live Demo Sandbox</span>
                </Button>
              </Link>
            </div>

            {/* Trust Badges Bar */}
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">100% Terisolasi</div>
                  <div className="text-slate-500">Database per ISP</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">99.99% SLA</div>
                  <div className="text-slate-500">Cloud High Uptime</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">MikroTik Ready</div>
                  <div className="text-slate-500">RouterOS v6 & v7</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">FreeRADIUS 3.x</div>
                  <div className="text-slate-500">High-Speed Engine</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Cloud Architecture / UI Mockup Showcase */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
            {/* Header Mockup */}
            <div className="bg-slate-900 px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">admin.euginemediagroup.site/dashboard</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Network Sync Active</span>
                </span>
                <span className="hidden sm:inline text-slate-500">|</span>
                <span className="hidden sm:inline text-slate-400 font-mono">Tenant ID: isp-citranet-live</span>
              </div>
            </div>

            {/* Dashboard Mockup Body */}
            <div className="p-4 sm:p-6 bg-slate-50/60 space-y-5">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                    <span>PPPoE Aktif Online</span>
                    <Wifi className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">842 / 910</div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>92.5% Pelanggan Aktif</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                    <span>Voucher Terjual (Bulan Ini)</span>
                    <Printer className="w-4 h-4 text-[#002c60]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">1,420 Voucher</div>
                  <div className="text-[11px] text-slate-500 mt-1">Total Rp 7.100.000</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                    <span>Isolasi Otomatis (CoA)</span>
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">14 Pelanggan</div>
                  <div className="text-[11px] text-amber-600 mt-1">Jatuh tempo hari ini</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                    <span>TR-069 ACS ONT Online</span>
                    <Radio className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">798 Device</div>
                  <div className="text-[11px] text-slate-500 mt-1">Rata-rata Optical: -19.4 dBm</div>
                </div>
              </div>

              {/* Central Architecture Flow Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#002c60] uppercase tracking-wider">
                    <Server className="w-4 h-4" />
                    <span>MikroTik Router Cluster</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">CCR2004-Core-Router</div>
                        <div className="text-[11px] text-slate-500">VPN IP: 10.255.0.12</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Connected
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">RB4011-Distribusi-Utara</div>
                        <div className="text-[11px] text-slate-500">VPN IP: 10.255.0.18</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#002c60] uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Bot Billing</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                      <div className="font-semibold flex items-center justify-between">
                        <span>Invoice #INV-2026-0921</span>
                        <span className="text-[10px] text-emerald-700">Terkirim</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-1">
                        PDF Tagihan 50 Mbps terkirim ke WhatsApp 0812-XXXX-8921
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900">
                      <div className="font-semibold flex items-center justify-between">
                        <span>Notifikasi Pembayaran</span>
                        <span className="text-[10px] text-blue-700">Auto Lunas</span>
                      </div>
                      <div className="text-[11px] text-blue-800 mt-1">QRIS Rp 185.000 diverifikasi otomatis</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#002c60] uppercase tracking-wider">
                    <Radio className="w-4 h-4" />
                    <span>TR-069 ACS Telemetry</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">ONT ZTE F670L</div>
                        <div className="text-[11px] text-slate-500">SN: ZTEGC4219FA1</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-emerald-600">-18.2 dBm</div>
                        <div className="text-[10px] text-slate-400">Normal</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">ONT Huawei HG8245H5</div>
                        <div className="text-[11px] text-slate-500">SN: 48575443F89A</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-emerald-600">-20.1 dBm</div>
                        <div className="text-[10px] text-slate-400">Normal</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid (6 Key Modules) */}
      <section id="fitur" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50/50 font-semibold px-3 py-1">
              Modul Enterprise Terintegrasi
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#002c60] tracking-tight">
              Segala Kebutuhan Manajemen ISP & RT-RW Net dalam Satu Dasbor
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Dirancang khusus oleh praktisi jaringan untuk mengotomatisasi operasional teknis, penagihan, hingga layanan
              pelanggan tanpa beban server mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES_GRID.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#002c60] flex items-center justify-center group-hover:bg-[#002c60] group-hover:text-white transition-colors">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{feat.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center text-xs font-semibold text-[#1b437c] group-hover:text-[#002c60]">
                    <span>Fitur Lengkap Tersedia</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Price List Section */}
      <section id="harga" className="py-20 sm:py-28 bg-[#f9f9fe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50 font-semibold px-3 py-1">
              Transparan & Terjangkau
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#002c60] tracking-tight">
              Pilihan Paket Sesuai Skala Jaringan Anda
            </h2>
            <p className="text-base text-slate-600">
              Mulai gratis 7 hari tanpa kartu kredit. Upgrade atau sesuaikan kapasitas kapan saja seiring bertumbuhnya jumlah pelanggan Anda.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span
                className={`text-sm font-semibold cursor-pointer ${
                  billingCycle === 'monthly' ? 'text-[#002c60]' : 'text-slate-500'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                Ditagih Bulanan
              </span>
              <Switch
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                className="data-[state=checked]:bg-[#002c60]"
              />
              <span
                className={`text-sm font-semibold cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly' ? 'text-[#002c60]' : 'text-slate-500'
                }`}
                onClick={() => setBillingCycle('yearly')}
              >
                <span>Ditagih Tahunan</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Hemat 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {PLANS.map((plan) => {
              const displayPrice =
                billingCycle === 'yearly' ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice;

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl transition-all duration-200 bg-white ${
                    plan.isPopular
                      ? 'border-2 border-[#002c60] shadow-xl shadow-blue-900/10 lg:-translate-y-2'
                      : 'border border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#002c60] text-white text-xs font-bold px-4 py-1 rounded-full tracking-wide shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                      <span>PALING POPULER & REKOMENDASI</span>
                    </div>
                  )}

                  <CardHeader className="pt-8 pb-4">
                    <CardTitle className="text-2xl font-bold text-[#002c60]">{plan.name}</CardTitle>
                    <CardDescription className="text-slate-600 text-xs leading-relaxed min-h-[36px]">
                      {plan.tagline}
                    </CardDescription>

                    <div className="pt-4 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                        {formatCurrency(displayPrice)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">/ bulan</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-emerald-600 font-medium pt-1">
                        Ditagih tahunan (Total {formatCurrency(displayPrice * 12)} / tahun)
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 py-4 flex-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Fitur Termasuk:
                    </div>
                    <ul className="space-y-3 text-sm text-slate-700">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4 pb-8">
                    <Button
                      onClick={() => handleOpenRegister(plan.id)}
                      className={`w-full py-6 font-semibold text-sm transition-all ${
                        plan.isPopular
                          ? 'bg-[#002c60] hover:bg-[#1b437c] text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      }`}
                    >
                      <span>{plan.ctaLabel}</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Tanpa Kartu Kredit
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Pembatalan Kapan Saja
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Bantuan Setup Gratis dari Tim Ahli
            </span>
          </div>
        </div>
      </section>

      {/* Security & Data Isolation Badges */}
      <section id="keamanan" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50 font-semibold px-3 py-1">
              Keamanan Tingkat Tinggi
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#002c60] tracking-tight">
              Arsitektur Cloud Andal untuk Bisnis Tanpa Hambatan
            </h2>
            <p className="text-base text-slate-600">
              Kredibilitas ISP Anda adalah prioritas utama. Kami menjamin integritas data pelanggan dan stabilitas koneksi jaringan 24/7.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECURITY_BADGES.map((sec, idx) => {
              const SecIcon = sec.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#002c60] border border-slate-200 flex items-center justify-center shadow-2xs">
                    <SecIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{sec.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Accordion */}
      <section id="faq" className="py-20 bg-[#f9f9fe] border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50 font-semibold px-3 py-1">
              Tanya Jawab (FAQ)
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#002c60] tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-base text-slate-600">
              Segala hal yang perlu Anda ketahui mengenai aktivasi, teknis, dan dukungan EugineBill Cloud.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left px-5 py-4 sm:py-5 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-[#002c60] transition-colors"
                  >
                    <span className="text-base sm:text-lg">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#002c60]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm sm:text-base text-slate-600 border-t border-slate-100 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Final CTA Banner */}
      <section className="py-16 sm:py-20 bg-[#002c60] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Siap Mengembangkan Bisnis ISP & RT-RW Net Anda ke Tingkat Berikutnya?
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Dapatkan instance billing cloud mandiri dengan isolasi database dan aktivasi instan dalam waktu kurang dari 1 menit.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => handleOpenRegister('pro')}
              className="w-full sm:w-auto bg-white text-[#002c60] hover:bg-slate-100 font-bold px-8 py-6 text-base shadow-lg transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2 text-[#002c60]" />
              <span>Coba Gratis 7 Hari Sekarang</span>
            </Button>
            <Link href="/admin/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-6 text-base"
              >
                <span>Masuk ke Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1b437c] flex items-center justify-center text-white font-bold">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-base tracking-tight">EugineBill Cloud SaaS</span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-slate-400">
              <a href="#fitur" className="hover:text-white transition-colors">
                Fitur
              </a>
              <a href="#harga" className="hover:text-white transition-colors">
                Harga
              </a>
              <a href="#keamanan" className="hover:text-white transition-colors">
                Keamanan
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                FAQ
              </a>
              <Link href="/customer/login" className="hover:text-white transition-colors">
                Customer Portal
              </Link>
              <Link href="/technician/login" className="hover:text-white transition-colors">
                Technician Portal
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              &copy; {new Date().getFullYear()} EugineBill Cloud Platform. Seluruh hak cipta dilindungi.
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Semua Sistem Operasional 99.99%</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive "Coba Gratis 7 Hari" Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={(open) => !isSubmitting && setIsRegisterOpen(open)}>
        <DialogContent className="max-w-lg p-6 bg-white rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[#002c60] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              <span>Mulai Trial Gratis 7 Hari</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500">
              Instance database cloud dan subdomain mandiri Anda akan disiapkan secara instan.
            </DialogDescription>
          </DialogHeader>

          {isSubmitting ? (
            /* Provisioning Progress Stepper Screen */
            <div className="py-8 px-2 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#002c60] flex items-center justify-center mx-auto animate-pulse">
                  <Cpu className="w-7 h-7 animate-spin" />
                </div>
                <h3 className="font-bold text-lg text-[#002c60]">Menyiapkan Cloud Tenant Anda...</h3>
                <p className="text-xs text-slate-500">Mohon jangan menutup halaman ini.</p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {PROVISIONING_STEPS.map((stepText, sIdx) => {
                  const isDone = currentStepIndex > sIdx;
                  const isCurrent = currentStepIndex === sIdx;

                  return (
                    <div key={sIdx} className="flex items-center gap-3 text-xs sm:text-sm">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#002c60] border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span
                        className={`${
                          isDone
                            ? 'text-slate-800 font-medium'
                            : isCurrent
                            ? 'text-[#002c60] font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {stepText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Registration Form Screen */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Selected Plan Display */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Paket Dipilih:</div>
                  <div className="font-bold text-[#002c60] text-sm">
                    Paket {selectedPlan.toUpperCase()} ({billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'})
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRegisterOpen(false)}
                  className="text-xs text-[#1b437c] hover:bg-blue-100/50"
                >
                  Ubah Paket
                </Button>
              </div>

              {/* ISP / Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-xs font-semibold text-slate-700">
                  Nama ISP / Usaha RT-RW Net <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="companyName"
                    placeholder="Contoh: PT Citra Solusi Internet / CitraNet"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Subdomain Input with Live Checker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subdomain" className="text-xs font-semibold text-slate-700">
                    Subdomain Pilihan <span className="text-rose-500">*</span>
                  </Label>
                  {subdomainStatus === 'checking' && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Memeriksa...
                    </span>
                  )}
                  {subdomainStatus === 'available' && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tersedia
                    </span>
                  )}
                  {subdomainStatus === 'unavailable' && (
                    <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Tidak Tersedia
                    </span>
                  )}
                </div>

                <div className="flex rounded-lg shadow-xs">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="subdomain"
                      placeholder="citranet"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="pl-9 rounded-r-none border-r-0 text-sm font-mono"
                      required
                    />
                  </div>
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono">
                    .euginemediagroup.site
                  </span>
                </div>
                {subdomainMessage && (
                  <p
                    className={`text-[11px] ${
                      subdomainStatus === 'available' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {subdomainMessage}
                  </p>
                )}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email Penanggung Jawab <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@citranet.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password SuperAdmin */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password SuperAdmin Baru <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisterOpen(false)}
                  className="text-xs sm:text-sm"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={subdomainStatus === 'unavailable'}
                  className="bg-[#002c60] hover:bg-[#1b437c] text-white font-semibold text-xs sm:text-sm shadow-sm"
                >
                  <span>Mulai Trial 7 Hari (Aktivasi Instan)</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
