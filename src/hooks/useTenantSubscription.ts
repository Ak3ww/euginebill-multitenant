'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TenantSubscriptionData {
  id?: string;
  name?: string;
  slug?: string;
  email?: string;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'DEMO';
  planName: string;
  planCode: string;
  priceMonthly: number;
  maxRouters?: number;
  maxUsers?: number;
  isDemo: boolean;
  trialEndsAt: string | null;
  expiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
  isReadOnly: boolean;
}

export function useTenantSubscription() {
  const [data, setData] = useState<TenantSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subscription');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat status langganan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription: data,
    loading,
    error,
    refreshSubscription: fetchSubscription,
  };
}
