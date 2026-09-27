'use client';

import React, { useState } from 'react';
import { useTenantSubscription } from '@/hooks/useTenantSubscription';
import { TenantUpgradeModal } from './TenantUpgradeModal';
import { Sparkles, AlertTriangle, ShieldAlert, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function TenantLicenseBanner() {
  const { subscription, loading } = useTenantSubscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  if (loading || !subscription) return null;

  // Branch 1: Expired / Read-Only Mode Banner
  if (subscription.isExpired || subscription.isReadOnly) {
    return (
      <>
        <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-30">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <span className="font-bold">Masa Lisensi Telah Berakhir (Mode Read-Only Aktif).</span>
              <span className="text-rose-100 ml-1.5 hidden md:inline">
                Anda tetap dapat melihat data & konfigurasi, namun aksi simpan data baru dinonaktifkan sementara.
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs px-4 py-1.5 shadow-sm shrink-0"
          >
            <span>Aktifkan Kembali Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <TenantUpgradeModal
          open={isUpgradeModalOpen}
          onOpenChange={setIsUpgradeModalOpen}
          currentPlanCode={subscription.planCode}
          isExpired={true}
        />
      </>
    );
  }

  // Branch 2: Trial Mode Banner
  if (subscription.status === 'TRIAL') {
    return (
      <>
        <div className="bg-gradient-to-r from-[#002c60] to-[#1b437c] text-white px-4 py-2 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs z-30 border-b border-blue-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Masa Uji Coba:</strong> Sisa{' '}
              <span className="font-bold text-amber-300 underline">{subscription.daysRemaining} hari lagi</span>{' '}
              (Paket {subscription.planName}).
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-1 shadow-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span>Upgrade Paket</span>
          </Button>
        </div>

        <TenantUpgradeModal
          open={isUpgradeModalOpen}
          onOpenChange={setIsUpgradeModalOpen}
          currentPlanCode={subscription.planCode}
          isExpired={false}
        />
      </>
    );
  }

  // Branch 3: Active Plan with Expiry Warning (< 7 days)
  if (subscription.status === 'ACTIVE' && subscription.daysRemaining <= 7) {
    return (
      <>
        <div className="bg-amber-500 text-slate-950 px-4 py-2 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs z-30">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              Langganan Paket {subscription.planName} Anda akan berakhir dalam <strong>{subscription.daysRemaining} hari</strong>.
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1 shrink-0"
          >
            <span>Perpanjang Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <TenantUpgradeModal
          open={isUpgradeModalOpen}
          onOpenChange={setIsUpgradeModalOpen}
          currentPlanCode={subscription.planCode}
          isExpired={false}
        />
      </>
    );
  }

  return null;
}
