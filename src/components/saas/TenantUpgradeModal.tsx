'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Sparkles, Check, ArrowRight, ShieldCheck, Zap, Globe, MessageSquare, ExternalLink } from 'lucide-react';

interface TenantUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanCode?: string;
  isExpired?: boolean;
}

const UPGRADE_PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 99000,
    desc: 'Untuk RT/RW Net pemula.',
    features: [
      '1 Router MikroTik',
      'Hingga 100 Pelanggan PPPoE',
      '500 Voucher Hotspot / bln',
      'Notifikasi WhatsApp Tagihan',
      'Isolasi Pelanggan Otomatis (CoA)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro ISP',
    price: 249000,
    isPopular: true,
    desc: 'Paling diminati ISP berkembang.',
    features: [
      '5 Router MikroTik',
      'Hingga 1.000 Pelanggan PPPoE',
      'Unlimited Voucher Hotspot',
      'WhatsApp Bot Interaktif (Invoice PDF)',
      'TR-069 GenieACS Remote ONT',
      'Multi-Admin & Akses Teknisi Lapangan',
      'Payment Gateway QRIS Otomatis',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499000,
    desc: 'Arsitektur skala besar + Whitelabel.',
    features: [
      'Unlimited Router MikroTik',
      'Unlimited Pelanggan PPPoE & Hotspot',
      'Dedicated VPN Server',
      'Gratis Custom Domain & Whitelabel Logo',
      'Integrasi OLT VSOL, ZTE, Huawei',
      'Prioritas Dukungan Teknis 24/7',
    ],
  },
];

export function TenantUpgradeModal({
  open,
  onOpenChange,
  currentPlanCode,
  isExpired,
}: TenantUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  const handleContactBilling = (planId: string) => {
    const message = encodeURIComponent(
      `Halo Tim Billing EugineBill SaaS, saya ingin upgrade / perpanjang lisensi ke Paket ${planId.toUpperCase()} untuk instance saya.`
    );
    window.open(`https://wa.me/6281234567890?text=${message}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-[#002c60] to-[#1b437c] text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <DialogTitle className="text-xl font-black">
              {isExpired ? 'Perpanjang Lisensi Cloud Instance' : 'Upgrade Paket Langganan SaaS'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-sky-100">
            Pilih paket yang sesuai dengan kapasitas jaringan dan kebutuhan operasional ISP Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {UPGRADE_PLANS.map((plan) => {
              const isCurrent = currentPlanCode === plan.id;
              const isSelected = selectedPlan === plan.id;

              return (
                <Card
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`cursor-pointer flex flex-col justify-between relative rounded-xl transition-all border ${
                    isSelected
                      ? 'border-[#002c60] ring-2 ring-[#002c60]/20 bg-blue-50/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#002c60] text-white text-[10px] font-bold uppercase tracking-wider">
                      Rekomendasi
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-bold text-slate-900">{plan.name}</CardTitle>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                          Paket Saat Ini
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-[11px] text-slate-500">{plan.desc}</CardDescription>

                    <div className="pt-2 pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Rp</span>
                      <span className="text-2xl font-black text-slate-950 ml-1">
                        {plan.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-slate-500"> / bln</span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 flex-1 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Termasuk:</div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-4 pt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactBilling(plan.id);
                      }}
                      className={`w-full text-xs font-bold py-4 transition-all ${
                        isSelected
                          ? 'bg-[#002c60] hover:bg-[#1b437c] text-white shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>Pilih & Bayar</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#002c60] shrink-0" />
              <div>
                <span className="font-bold text-slate-900">Ingin Whitelabel & Custom Domain?</span>
                <p className="text-slate-500 text-[11px]">
                  Tersedia gratis di Paket Enterprise atau sebagai Add-on bulanan Rp 100.000 / bulan.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleContactBilling('whitelabel-addon')}
              className="text-xs shrink-0 font-semibold text-[#002c60] border-[#002c60]/30 hover:bg-blue-50"
            >
              <span>Tanya Whitelabel Add-on</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
