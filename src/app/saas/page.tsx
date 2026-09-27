'use client';

import React, { useState, useEffect } from 'react';
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
  Building2,
  Globe,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  Users,
  Cpu,
  Star,
  Quote,
  Copy,
  ExternalLink,
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
    name: 'Pro ISP',
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
    desc: 'Integrasi langsung dengan RouterOS v6 & v7 via secure VPN tunnel proxy. Akses remote Winbox, API socket, dan WebFig tanpa memerlukan IP publik statis di lokasi router.',
  },
  {
    icon: Zap,
    title: 'FreeRADIUS 3.x High-Performance',
    desc: 'Engine autentikasi AAA performa tinggi berskala puluhan ribu sesi simultan. Dilengkapi CoA Disconnect untuk eksekusi isolasi dan aktivasi instan tanpa reboot router.',
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

const TESTIMONIALS = [
  {
    name: 'Budi Santoso',
    role: 'Owner & Network Engineer',
    company: 'CitraNet Mandiri — Bogor, Jawa Barat',
    comment: 'Sebelumnya pusing mengelola 4 MikroTik dan isolasi pelanggan manual satu per satu tiap tanggal 20. Sejak pakai EugineBill, semua tagihan terkirim otomatis via WhatsApp dengan PDF resmi dan isolasi otomatis jika telat bayar. Cashflow jadi sangat lancar.',
    rating: 5,
    highlight: 'Kolektibilitas Tagihan Naik 98%',
  },
  {
    name: 'Ahmad Fauzi',
    role: 'CTO & Operational Lead',
    company: 'Megavision Fiber — Surabaya, Jawa Timur',
    comment: 'Fitur cetak voucher thermal dan TR-069 GenieACS sangat membantu tim teknisi kami di lapangan. Redaman optik ONT bisa dipantau langsung dari HP tanpa perlu datang ke rumah pelanggan.',
    rating: 5,
    highlight: 'Hemat Biaya Operasional Teknisi',
  },
  {
    name: 'Rian Ardiansyah',
    role: 'Founder',
    company: 'Borneo Fiber Net — Samarinda, Kaltim',
    comment: 'Arsitektur database terisolasi per tenant membuat kami percaya diri scale up pelanggan dari 200 ke 1.500+ pelanggan tanpa kendala database lambat. Sangat stabil dan profesional.',
    rating: 5,
    highlight: 'Scale Up dari 200 ke 1.500+ Pelanggan',
  },
];

const FAQS = [
  {
    q: 'Apakah saya membutuhkan IP Publik Statis di MikroTik saya?',
    a: 'Tidak perlu. EugineBill menyediakan secure VPN tunnel proxy bawaan (WireGuard & L2TP). MikroTik Anda cukup terkoneksi ke internet dan otomatis terhubung ke cloud server EugineBill.',
  },
  {
    q: 'Bagaimana cara kerja WhatsApp Bot Billing?',
    a: 'Sistem menggunakan engine WhatsApp Baileys native. Anda cukup scan QR code WhatsApp nomor bisnis Anda di panel admin, dan sistem akan otomatis mengirim notifikasi tagihan, invoice PDF, dan bukti lunas kepada pelanggan.',
  },
  {
    q: 'Apakah data pelanggan dan router saya aman dari ISP lain?',
    a: '100% Aman. EugineBill menggunakan arsitektur Database-per-Tenant terisolasi fisik. Database Anda terpisah secara independen dan tidak bercampur dengan database ISP manapun.',
  },
  {
    q: 'Apakah setelah masa uji coba 7 hari data konfigurasi saya akan hilang?',
    a: 'Tidak. Seluruh data router, paket, dan pelanggan yang sudah Anda masukkan saat uji coba 7 hari akan tetap tersimpan utuh saat Anda melanjutkan langganan.',
  },
  {
    q: 'Bisakah saya melakukan migrasi data dari billing lama saya?',
    a: 'Bisa. Tersedia fitur Import Pelanggan via Excel (.xlsx) dan sinkronisasi otomatis langsung dari database MikroTik PPP Secret & Hotspot User.',
  },
];

const PROVISIONING_STEPS = [
  'Memvalidasi data pendaftaran & ketersediaan subdomain...',
  'Menyiapkan cluster database terisolasi tenant...',
  'Menginisialisasi skema billing, RADIUS engine & tabel router...',
  'Mengonfigurasi layanan WhatsApp Bot & webhook gateway...',
  'Instansiasi selesai! Akun SuperAdmin siap digunakan.',
];

export default function SaaSLandingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('starter');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Subdomain check state
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [subdomainMessage, setSubdomainMessage] = useState('');

  // Submission & Provisioning states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    subdomain: string;
    email: string;
    loginUrl: string;
  } | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleOpenRegister = (planId: PlanType = 'starter') => {
    setSelectedPlan(planId);
    setErrorMessage(null);
    setRegistrationSuccessData(null);
    setIsRegisterOpen(true);
  };

  // Debounced Subdomain Availability Check
  useEffect(() => {
    const cleanSlug = subdomain.trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 3) {
      setSubdomainStatus('idle');
      setSubdomainMessage('');
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
      } catch {
        setSubdomainStatus('idle');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [subdomain]);

  // Handle Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
      setErrorMessage('Nomor WhatsApp wajib diisi untuk verifikasi.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password SuperAdmin minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    setCurrentStepIndex(0);

    try {
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
        await new Promise((resolve) => setTimeout(resolve, 750));
        setCurrentStepIndex(i);
      }

      const cleanSlug = subdomain.trim().toLowerCase();
      const originHost = typeof window !== 'undefined' ? window.location.host : 'euginemediagroup.site';
      const rootDomain = originHost.includes('localhost') ? 'localhost:3000' : 'euginemediagroup.site';
      const targetLoginUrl = `http://${cleanSlug}.${rootDomain}/admin/login?callbackUrl=/setup&email=${encodeURIComponent(email.trim().toLowerCase())}`;

      setRegistrationSuccessData({
        subdomain: `${cleanSlug}.${rootDomain}`,
        email: email.trim().toLowerCase(),
        loginUrl: targetLoginUrl,
      });
      setIsSubmitting(false);
    } catch {
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
          <strong>Rilis v2.40:</strong> Integrasi TR-069 GenieACS Multi-Vendor & QRIS Dinamis Otomatis kini tersedia!
        </span>
        <Link
          href="/register?plan=starter"
          className="underline font-semibold hover:text-sky-200 transition-colors ml-1 hidden sm:inline"
        >
          Coba Gratis 7 Hari Sekarang
        </Link>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c60] to-[#1b437c] flex items-center justify-center text-white shadow-md shadow-blue-950/15 group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-[#002c60] flex items-center gap-1.5">
                <span>EugineBill</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-[#002c60] font-bold tracking-normal">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                ISP & RT-RW Net Cloud Billing Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#002c60] transition-colors">
              Fitur Utama
            </a>
            <a href="#whitelabel" className="hover:text-[#002c60] transition-colors">
              Whitelabel & Add-ons
            </a>
            <a href="#pricing" className="hover:text-[#002c60] transition-colors">
              Pilihan Paket & Harga
            </a>
            <a href="#testimonials" className="hover:text-[#002c60] transition-colors">
              Testimoni ISP
            </a>
            <a href="#faq" className="hover:text-[#002c60] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/saas-admin/login">
              <Button variant="ghost" size="sm" className="text-slate-700 hover:text-[#002c60] text-xs font-semibold">
                Login Master SaaS
              </Button>
            </Link>
            <Link href="/register?plan=starter">
              <Button
                size="sm"
                className="bg-[#002c60] hover:bg-[#1b437c] text-white text-xs font-semibold px-4 shadow-sm shadow-blue-950/20"
              >
                Coba Gratis 7 Hari
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#002c60] text-xs font-semibold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Cloud ISP & RT-RW Net Billing Platform v2.40</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
              Sistem Billing & Manajemen Jaringan ISP{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002c60] via-[#1b437c] to-sky-600">
                Berbasis Cloud
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Kelola router MikroTik tak terbatas, isolasi pelanggan otomatis, WhatsApp Bot notifikasi PDF, FreeRADIUS 3 AAA, TR-069 ACS ONT, dan pembayaran QRIS dalam satu platform cloud terisolasi.
            </p>

            {/* Hero Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register?plan=starter" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#002c60] hover:bg-[#1b437c] text-white font-semibold px-8 py-6 text-base shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.99]"
                >
                  <span>Coba Gratis 7 Hari Sekarang</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#pricing" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-6 text-base"
                >
                  <span>Lihat Pilihan Paket</span>
                </Button>
              </a>
            </div>

            {/* Trust Badges Grid */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">100% Data Terisolasi</div>
                  <div className="text-slate-500">Database Mandiri per ISP</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">99.99% Uptime SLA</div>
                  <div className="text-slate-500">Cloud High Availability</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">MikroTik Ready</div>
                  <div className="text-slate-500">RouterOS v6 & v7 Support</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#002c60] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">FreeRADIUS 3.x</div>
                  <div className="text-slate-500">High-Speed CoA Engine</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50/50 text-xs px-3 py-1 font-bold">
              Fitur Lengkap Turnkey
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Semua yang Dibutuhkan ISP & RT/RW Net
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Didesain khusus untuk mempermudah operasional billing, otomatisasi tagihan, dan monitoring teknis dari hulu ke hilir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES_GRID.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-slate-200 bg-[#fbfbfe] hover:bg-white hover:border-[#1b437c]/30 hover:shadow-lg hover:shadow-blue-950/5 transition-all space-y-3 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-[#002c60] group-hover:bg-[#002c60] group-hover:text-white transition-colors flex items-center justify-center shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Whitelabel & Add-ons Section */}
      <section id="whitelabel" className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 to-[#002c60] text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="outline" className="text-sky-300 border-sky-400/40 bg-sky-950/50 text-xs px-3 py-1 font-bold">
              Whitelabel & Custom Brand Add-on
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Tingkatkan Brand Awareness Bisnis ISP Anda
            </h2>
            <p className="text-sm sm:text-base text-sky-100/80 leading-relaxed">
              Ubah portal pelanggan, faktur PDF, bot WhatsApp, dan aplikasi PWA agar secara visual mencerminkan 100% identitas merek ISP Anda dengan domain mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-400/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Custom Domain Sendiri</h3>
              <p className="text-xs text-sky-100/70 leading-relaxed">
                Gunakan domain khusus ISP Anda (misal: <code className="text-sky-300 font-mono">billing.ispanda.co.id</code>) lengkap dengan sertifikat SSL otomatis.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-400/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Kustomisasi Logo & Identitas</h3>
              <p className="text-xs text-sky-100/70 leading-relaxed">
                Pasang logo resmi ISP, warna tema, favicon, kop surat faktur, dan template cetak thermal voucher tanpa watermark pihak ketiga.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-400/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Gratis di Paket Enterprise</h3>
              <p className="text-xs text-sky-100/70 leading-relaxed">
                Fitur Whitelabel sudah termasuk secara gratis di Paket Enterprise atau dapat diaktifkan sebagai Add-on bulanan untuk paket lainnya.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-[#f9f9fe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50/50 text-xs px-3 py-1 font-bold">
              Pilihan Paket & Harga
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Investasi Hemat untuk Bisnis ISP Anda
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Mulai gratis 7 hari tanpa kartu kredit. Tingkatkan paket kapan saja sesuai pertumbuhan jaringan pelanggan Anda.
            </p>

            {/* Monthly / Yearly Billing Cycle Switch */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <span className={`text-xs sm:text-sm font-semibold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
                Ditagih Bulanan
              </span>
              <Switch
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
              />
              <div className="flex items-center gap-1.5">
                <span className={`text-xs sm:text-sm font-semibold ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Ditagih Tahunan
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Hemat 20%
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {PLANS.map((plan) => {
              const price = billingCycle === 'yearly' ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice;
              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between relative rounded-2xl transition-all ${
                    plan.isPopular
                      ? 'border-2 border-[#002c60] bg-white shadow-xl shadow-blue-900/10 scale-100 lg:scale-105 z-10'
                      : 'border border-slate-200 bg-white/90 shadow-sm hover:border-slate-300'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#002c60] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Paling Populer & Rekomendasi</span>
                    </div>
                  )}

                  <CardHeader className="p-6 pb-4 space-y-2">
                    <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                      {plan.tagline}
                    </CardDescription>

                    <div className="pt-3 pb-1 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-700">Rp</span>
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                          {price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500">/ bulan</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1">
                          Ditagih tahunan Rp {(price * 12).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 pt-2 flex-1 space-y-3">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Fitur & Kuota Termasuk:
                    </div>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-6 pt-2">
                    <Link href={`/register?plan=${plan.id}`} className="w-full">
                      <Button
                        className={`w-full py-5 font-semibold text-xs transition-all ${
                          plan.isPopular
                            ? 'bg-[#002c60] hover:bg-[#1b437c] text-white shadow-md shadow-blue-900/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>{plan.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50/50 text-xs px-3 py-1 font-bold">
              Testimoni Pengguna
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Dipercaya oleh Pengusaha ISP di Seluruh Indonesia
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Dengarkan cerita sukses bagaimana EugineBill membantu rekan-rekan ISP mengotomasi billing dan operasional jaringan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testi, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-200 bg-[#fbfbfe] flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(testi.rating)].map((_, rIdx) => (
                        <Star key={rIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-slate-300" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                    {testi.highlight}
                  </Badge>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{testi.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/70">
                  <div className="font-bold text-sm text-slate-900">{testi.name}</div>
                  <div className="text-xs text-slate-500 font-medium">{testi.role}</div>
                  <div className="text-[11px] text-[#002c60] font-semibold mt-0.5">{testi.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 bg-[#f9f9fe]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-[#002c60] border-blue-200 bg-blue-50/50 text-xs px-3 py-1 font-bold">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Punya pertanyaan seputar integrasi MikroTik, WhatsApp Bot, atau keamanan database? Temukan jawabannya di sini.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#002c60] text-white py-12 border-t border-[#1b437c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-sky-200" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">EugineBill SaaS Platform</div>
              <div className="text-xs text-sky-200/70">Powered by Eugine Media Group</div>
            </div>
          </div>

          <div className="text-xs text-sky-200/70 text-center sm:text-right space-y-1">
            <p>&copy; {new Date().getFullYear()} EugineBill. All rights reserved.</p>
            <p>Sistem Billing & Network Management ISP / RT-RW Net Berbasis Cloud.</p>
          </div>
        </div>
      </footer>

      {/* ── Interactive Registration & Provisioning Modal ── */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border-slate-200">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-[#002c60] to-[#1b437c] text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Mulai Uji Coba Gratis 7 Hari</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-sky-100">
              Database cloud dan subdomain terisolasi Anda akan dibuatkan secara instan.
            </DialogDescription>
          </DialogHeader>

          {/* Body Section */}
          <div className="p-6 space-y-4">
            {/* Step 1: Active Form Input */}
            {!isSubmitting && !registrationSuccessData && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Plan Selector Badge */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Paket Terpilih:</span>
                    <span className="font-bold text-[#002c60] ml-1.5 uppercase">
                      {PLANS.find((p) => p.id === selectedPlan)?.name} ({billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {PLANS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          selectedPlan === p.id
                            ? 'bg-[#002c60] text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nama ISP */}
                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className="text-xs font-bold text-slate-700">
                    Nama ISP / Usaha RT-RW Net *
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Contoh: PT Citra Solusi Internet / CitraNet"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (!subdomain) {
                        setSubdomain(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, '')
                            .slice(0, 20)
                        );
                      }
                    }}
                    className="text-xs"
                    required
                  />
                </div>

                {/* Subdomain Choice */}
                <div className="space-y-1.5">
                  <Label htmlFor="subdomain" className="text-xs font-bold text-slate-700">
                    Subdomain Pilihan Anda *
                  </Label>
                  <div className="flex rounded-md shadow-xs">
                    <Input
                      id="subdomain"
                      placeholder="citranet"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="rounded-r-none border-r-0 text-xs font-mono"
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono">
                      .euginemediagroup.site
                    </span>
                  </div>
                  {subdomainMessage && (
                    <p
                      className={`text-[11px] ${
                        subdomainStatus === 'available' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-medium'
                      }`}
                    >
                      {subdomainMessage}
                    </p>
                  )}
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                      Email SuperAdmin *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ispanda.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                      Nomor WhatsApp *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Password SuperAdmin */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                    Password SuperAdmin *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9 text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={subdomainStatus === 'unavailable' || subdomainStatus === 'checking'}
                  className="w-full bg-[#002c60] hover:bg-[#1b437c] text-white font-semibold py-5 text-xs shadow-md"
                >
                  <span>Daftar & Siapkan Instance Sekarang</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            )}

            {/* Step 2: Live Provisioning Stepper Animation */}
            {isSubmitting && (
              <div className="py-6 space-y-6 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-[#002c60] border-t-transparent animate-spin mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Menyiapkan Cloud Instance Anda...</h3>
                  <p className="text-xs text-slate-500 mt-1">Mohon jangan menutup halaman ini.</p>
                </div>

                <div className="space-y-2.5 text-left max-w-sm mx-auto">
                  {PROVISIONING_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 text-xs transition-colors ${
                          isDone
                            ? 'text-emerald-700 font-semibold'
                            : isCurrent
                            ? 'text-[#002c60] font-bold animate-pulse'
                            : 'text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full border-2 border-[#002c60] border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Success Screen with Credentials & Direct Login Button */}
            {registrationSuccessData && (
              <div className="py-4 space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-950">Instance SaaS Anda Siap!</h3>
                  <p className="text-xs text-slate-600">
                    Database cloud dan subdomain mandiri Anda telah berhasil diinisialisasi.
                  </p>
                </div>

                {/* Credentials Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Subdomain Portal:</span>
                    <span className="font-mono font-bold text-[#002c60]">{registrationSuccessData.subdomain}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Username / Email:</span>
                    <span className="font-mono font-bold text-slate-900">{registrationSuccessData.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Status Akun:</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                      Trial 7 Hari Aktif
                    </Badge>
                  </div>
                </div>

                {/* Primary Login Button leading to Login -> Setup */}
                <Button
                  onClick={() => {
                    window.location.href = registrationSuccessData.loginUrl;
                  }}
                  className="w-full bg-[#002c60] hover:bg-[#1b437c] text-white font-bold py-6 text-sm shadow-md shadow-blue-950/20"
                >
                  <span>Masuk ke Halaman Login Admin</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-[11px] text-slate-500">
                  Setelah login dengan akun di atas, Anda akan langsung diarahkan ke Wizard Setup Onboarding.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
