'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Wifi,
  Sparkles,
  Lock,
  Database,
  Building2,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Server,
  Zap,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const PROVISIONING_STEPS = [
  'Memvalidasi data pendaftaran akun...',
  'Menyiapkan cluster database cloud terisolasi...',
  'Menginisialisasi skema billing, FreeRADIUS & tabel router...',
  'Mengonfigurasi akun SuperAdmin & template WhatsApp...',
  'Instansiasi selesai! Menyiapkan portal billing...',
];

function RegisterFormContent() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form submission & provisioning animation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    subdomain: string;
    email: string;
    loginUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Format alamat email tidak valid.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage('Nomor Telepon / WhatsApp wajib diisi (minimal 8 digit).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    setCurrentStepIndex(0);

    try {
      // Clean phone number (add 0 or handle +62)
      let cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('62')) {
        cleanPhone = '0' + cleanPhone.slice(2);
      } else if (!cleanPhone.startsWith('0')) {
        cleanPhone = '0' + cleanPhone;
      }

      const res = await fetch('/api/saas/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          password,
          plan: 'starter',
          planCode: 'starter',
          billingCycle: 'monthly',
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setIsSubmitting(false);
        setErrorMessage(result.message || 'Pendaftaran gagal. Silakan periksa kembali formulir Anda.');
        return;
      }

      // Progress animation sequence
      for (let i = 1; i < PROVISIONING_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        setCurrentStepIndex(i);
      }

      const cleanSlug = result.data?.tenant?.slug || result.data?.slug || 'tenant';
      const originHost = typeof window !== 'undefined' ? window.location.host : 'euginemediagroup.site';
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
      const rootDomain = originHost.includes('localhost') ? 'localhost:3000' : 'euginemediagroup.site';
      const targetLoginUrl = `${protocol}//${cleanSlug}.${rootDomain}/admin/login?callbackUrl=/setup&email=${encodeURIComponent(email.trim().toLowerCase())}`;

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

  const handleCopyCredentials = () => {
    if (!registrationSuccessData) return;
    const text = `Portal URL: ${registrationSuccessData.loginUrl}\nUsername/Email: ${registrationSuccessData.email}\nPassword: (password yang Anda buat)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9f9fe] text-[#1a1c20] antialiased flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c60] to-[#1b437c] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-[#002c60] flex items-center gap-1.5">
                <span>EugineBill</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-[#002c60] font-bold tracking-normal">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Cloud ISP Billing Platform</p>
            </div>
          </Link>

          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-[#002c60]">
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-xl shadow-blue-950/5 overflow-hidden">
            {/* Card Banner Header */}
            <div className="bg-gradient-to-r from-[#002c60] to-[#1b437c] p-6 text-white text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Uji Coba Gratis 7 Hari • Akses Penuh</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">Daftar Akun Baru</h1>
              <p className="text-xs text-sky-100/90 max-w-md mx-auto leading-relaxed">
                Instance cloud dan cluster database MySQL mandiri Anda akan disiapkan secara instan.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* State 1: Active Form Input */}
              {!isSubmitting && !registrationSuccessData && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Included Trial Badge */}
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#002c60]">Trial 7 Hari Langsung Aktif:</span>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                        Nikmati seluruh fitur billing MikroTik PPPoE & Hotspot, bot WhatsApp PDF, dan TR-069 ACS ONT. Paket langganan dapat dipilih kapan saja dari dalam dashboard.
                      </p>
                    </div>
                  </div>

                  {/* 1. Nama Lengkap */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">
                      Nama Lengkap *
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Masukkan nama lengkap Anda"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xs h-10"
                      required
                    />
                  </div>

                  {/* 2. Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Masukkan alamat email aktif"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs h-10"
                      required
                    />
                  </div>

                  {/* 3. Nomor Telepon / WhatsApp */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                      Nomor Telepon / WhatsApp *
                    </Label>
                    <div className="flex rounded-md shadow-xs">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold">
                        +62
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="81234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded-l-none text-xs h-10"
                        required
                      />
                    </div>
                  </div>

                  {/* 4. Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                      Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Masukkan password (min. 6 karakter)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 text-xs h-10"
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

                  {/* Submit CTA */}
                  <Button
                    type="submit"
                    className="w-full bg-[#002c60] hover:bg-[#1b437c] text-white font-bold py-6 text-sm shadow-md shadow-blue-950/20 transition-all hover:scale-[1.01]"
                  >
                    <span>Mulai Inisiasi Cloud Tenant Sekarang</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}

              {/* State 2: Live Provisioning Stepper Animation */}
              {isSubmitting && (
                <div className="py-8 space-y-6 text-center">
                  <div className="w-14 h-14 rounded-full border-4 border-[#002c60] border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">Menyiapkan Cloud Instance Anda...</h3>
                    <p className="text-xs text-slate-500 mt-1">Mohon tunggu beberapa detik, database terisolasi sedang dibuat.</p>
                  </div>

                  <div className="space-y-3 text-left max-w-sm mx-auto pt-2">
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

              {/* State 3: Success Screen with Direct Login Redirection */}
              {registrationSuccessData && (
                <div className="py-4 space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-950">Cloud Tenant Berhasil Dibuat!</h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Subdomain mandiri dan cluster database MySQL Anda telah aktif dan siap digunakan.
                    </p>
                  </div>

                  {/* Credentials Box */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Subdomain Portal:</span>
                      <span className="font-mono font-bold text-[#002c60]">{registrationSuccessData.subdomain}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Username / Login ID:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {registrationSuccessData.email} <span className="text-slate-400 font-normal">atau</span> superadmin
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Masa Trial:</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                        7 Hari Gratis Aktif
                      </Badge>
                    </div>
                  </div>

                  {/* Big CTA Button */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        window.location.href = registrationSuccessData.loginUrl;
                      }}
                      className="w-full bg-[#002c60] hover:bg-[#1b437c] text-white font-bold py-6 text-sm shadow-md shadow-blue-950/20"
                    >
                      <span>Masuk ke Halaman Login Tenant</span>
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCredentials}
                      className="w-full text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                      <span>{copied ? 'Kredensial Disalin!' : 'Salin Kredensial Login'}</span>
                    </Button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Setelah login di portal tenant, Anda akan langsung diarahkan ke Wizard Onboarding Setup (/setup).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} EugineBill SaaS. Powered by Eugine Media Group.
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9fe] flex items-center justify-center text-xs text-slate-500">Memuat formulir...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
