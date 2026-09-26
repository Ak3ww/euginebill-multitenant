"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  CreditCard,
  Router,
  TrendingUp,
  Clock,
  Plus,
  Search,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  KeyRound,
  Trash2,
  Calendar,
  Layers,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Globe,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type TenantPlan = {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  maxRouters: number;
  maxUsers: number;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "DEMO";
  databaseName: string;
  customDomain: string | null;
  planId: string | null;
  trialEndsAt: string | null;
  expiresAt: string | null;
  totalRouters: number;
  totalCustomers: number;
  mrr: number;
  isDemo: boolean;
  notes: string | null;
  createdAt: string;
  plan?: TenantPlan;
};

type Stats = {
  totalTenants: number;
  activeTrials: number;
  paidSubscriptions: number;
  totalMrr: number;
  totalRouters: number;
  totalCustomers: number;
};

export default function SaaSAdminDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<TenantPlan[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTrials: 0,
    paidSubscriptions: 0,
    totalMrr: 0,
    totalRouters: 0,
    totalCustomers: 0,
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [actionLoading, setActionLoading] = useState(false);

  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantPlanId, setNewTenantPlanId] = useState("");
  const [newTenantStatus, setNewTenantStatus] = useState("TRIAL");
  const [newTenantTrialDays, setNewTenantTrialDays] = useState(7);
  const [newTenantNotes, setNewTenantNotes] = useState("");

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [tenantsRes, plansRes] = await Promise.all([
        fetch("/api/saas-admin/tenants"),
        fetch("/api/saas-admin/plans"),
      ]);

      if (tenantsRes.ok) {
        const tData = await tenantsRes.json();
        setTenants(tData.tenants || []);
        if (tData.stats) setStats(tData.stats);
      }

      if (plansRes.ok) {
        const pData = await plansRes.json();
        setPlans(pData.plans || []);
        if (pData.plans?.length > 0 && !newTenantPlanId) {
          setNewTenantPlanId(pData.plans[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load SaaS dashboard data:", err);
      toast({
        title: "Gagal memuat data",
        description: "Tidak dapat terhubung ke server SaaS Master.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCopySubdomain = (slug: string) => {
    const domain = `${slug}.euginebill.com`;
    navigator.clipboard.writeText(domain);
    setCopiedSlug(slug);
    toast({
      title: "Subdomain Disalin",
      description: `${domain} telah disalin ke clipboard.`,
    });
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newTenantEmail) {
      toast({
        title: "Validasi Gagal",
        description: "Nama ISP, Subdomain Slug, dan Email wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/saas-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTenantName,
          slug: newTenantSlug,
          email: newTenantEmail,
          phone: newTenantPhone,
          planId: newTenantPlanId,
          status: newTenantStatus,
          trialDays: newTenantTrialDays,
          notes: newTenantNotes,
          isDemo: newTenantStatus === "DEMO",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat tenant");
      }

      toast({
        title: "Tenant Berhasil Didaftarkan",
        description: `Tenant ${data.tenant.name} (${data.tenant.slug}.euginebill.com) siap digunakan.`,
      });

      setIsCreateOpen(false);
      // Reset form
      setNewTenantName("");
      setNewTenantSlug("");
      setNewTenantEmail("");
      setNewTenantPhone("");
      setNewTenantNotes("");
      fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Error Pendaftaran",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      toast({
        title: "Menyiapkan Sesi Impersonasi...",
        description: `Membuat token akses SuperAdmin untuk ${tenant.name}.`,
      });

      const res = await fetch(`/api/saas-admin/tenants/${tenant.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "impersonate" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat token impersonasi");
      }

      // Redirect directly to impersonation handler
      window.open(data.impersonateUrl, "_blank");
    } catch (err: any) {
      toast({
        title: "Gagal Impersonasi",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleExtend = async () => {
    if (!selectedTenant) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/saas-admin/tenants/${selectedTenant.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend", days: extendDays }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperpanjang masa aktif");
      }

      toast({
        title: "Perpanjangan Berhasil",
        description: data.message,
      });

      setIsExtendOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Error Perpanjangan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDemo = async (tenant: Tenant) => {
    if (!confirm(`Konfirmasi reset data tenant Demo '${tenant.name}' kembali ke 0% setup?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/saas-admin/tenants/${tenant.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-demo" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mereset data demo");
      }

      toast({
        title: "Demo Reset Sukses",
        description: data.message,
      });
      fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Gagal Reset Demo",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/saas-admin/tenants/${tenant.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status tenant");
      }

      toast({
        title: "Status Diperbarui",
        description: data.message,
      });
      fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Error Status",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/saas-admin/tenants/${selectedTenant.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus tenant");
      }

      toast({
        title: "Tenant Dihapus",
        description: data.message,
      });
      setIsDeleteOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Error Penghapusan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered tenants list
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: Tenant["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-semibold px-2 py-0.5 text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ACTIVE
          </Badge>
        );
      case "TRIAL":
        return (
          <Badge className="bg-blue-950/80 text-blue-400 border border-blue-700/60 font-semibold px-2 py-0.5 text-[11px] gap-1">
            <Clock className="w-3 h-3 text-blue-400" />
            TRIAL
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-amber-950/80 text-amber-400 border border-amber-700/60 font-semibold px-2 py-0.5 text-[11px] gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            SUSPENDED
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-rose-950/80 text-rose-400 border border-rose-700/60 font-semibold px-2 py-0.5 text-[11px] gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            EXPIRED
          </Badge>
        );
      case "DEMO":
        return (
          <Badge className="bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold px-2 py-0.5 text-[11px] gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            DEMO
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderExpiryInfo = (tenant: Tenant) => {
    if (tenant.status === "DEMO") {
      return <span className="text-xs text-purple-400 font-medium">Sandbox Unlimited</span>;
    }

    if (tenant.status === "TRIAL" && tenant.trialEndsAt) {
      const diffDays = Math.ceil(
        (new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 3600 * 24)
      );
      return (
        <div className="flex flex-col">
          <span
            className={`text-xs font-semibold ${
              diffDays > 2 ? "text-blue-400" : "text-amber-400 font-bold"
            }`}
          >
            {diffDays > 0 ? `${diffDays} Hari Tersisa` : "Trial Habis"}
          </span>
          <span className="text-[10px] text-slate-500">
            s/d {new Date(tenant.trialEndsAt).toLocaleDateString("id-ID")}
          </span>
        </div>
      );
    }

    if (tenant.expiresAt) {
      const diffDays = Math.ceil(
        (new Date(tenant.expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24)
      );
      return (
        <div className="flex flex-col">
          <span
            className={`text-xs font-medium ${
              diffDays > 7 ? "text-slate-300" : diffDays > 0 ? "text-amber-400" : "text-rose-400 font-bold"
            }`}
          >
            {diffDays > 0 ? `${diffDays} Hari Aktif` : "Kedaluwarsa"}
          </span>
          <span className="text-[10px] text-slate-500">
            s/d {new Date(tenant.expiresAt).toLocaleDateString("id-ID")}
          </span>
        </div>
      );
    }

    return <span className="text-xs text-slate-500">-</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-500" />
            <span>Multi-Tenant ISP Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau dan kelola seluruh tenant ISP, subdomain routing, kuota router MikroTik, dan langganan aktif.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 h-9 font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Tenant Baru
          </Button>
        </div>
      </div>

      {/* Top 5 Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Tenants */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Total Tenants</CardTitle>
            <Building2 className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.totalTenants}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>Terdaftar di cluster</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Active 7-Day Trials */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Trial Aktif</CardTitle>
            <Clock className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400 tracking-tight">{stats.activeTrials}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" />
              <span>Free 7-Day Trial</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Paid Subscriptions */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Paid Subscribers</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.paidSubscriptions}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Status aktif berbayar</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Total MRR */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Total MRR</CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white tracking-tight">
              {formatCurrency(stats.totalMrr)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Monthly Recurring Rev.</p>
          </CardContent>
        </Card>

        {/* Card 5: Total Routers Managed */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Total Routers</CardTitle>
            <Router className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400 tracking-tight">{stats.totalRouters}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-500" />
              <span>{stats.totalCustomers.toLocaleString()} Pelanggan ISP</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tenant Table Card */}
      <Card className="bg-slate-900/90 border-slate-800 shadow-xl">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <span>Daftar Tenant & Porting Subdomain</span>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs font-mono">
                  {filteredTenants.length} Tenant
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Akses langsung ke portal tiap ISP dan eksekusi impersonasi 1-time token.
              </CardDescription>
            </div>

            {/* Search & Filter Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Cari ISP, subdomain, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              {/* Status Filter Selector */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                {["ALL", "ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED", "DEMO"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      statusFilter === st
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Memuat data tenant dari cluster...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>Tidak ada data tenant yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Nama ISP & Kontak</th>
                    <th className="py-3 px-4 font-semibold">Subdomain Routing</th>
                    <th className="py-3 px-4 font-semibold">Paket Plan</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Sisa Waktu / Expired</th>
                    <th className="py-3 px-4 font-semibold">Router & Pelanggan</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredTenants.map((tenant) => {
                    return (
                      <tr
                        key={tenant.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Nama ISP & Kontak */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                              {tenant.name}
                              {tenant.isDemo && (
                                <Badge className="bg-purple-950 text-purple-300 border-purple-700/50 text-[9px] py-0 px-1">
                                  SANDBOX
                                </Badge>
                              )}
                            </span>
                            <span className="text-slate-400 text-[11px]">{tenant.email}</span>
                            {tenant.phone && (
                              <span className="text-slate-500 text-[10px]">{tenant.phone}</span>
                            )}
                          </div>
                        </td>

                        {/* Subdomain */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40 text-[11px]">
                              {tenant.slug}.euginebill.com
                            </span>
                            <button
                              onClick={() => handleCopySubdomain(tenant.slug)}
                              title="Salin Subdomain"
                              className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                            >
                              {copiedSlug === tenant.slug ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {tenant.customDomain && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Domain: {tenant.customDomain}
                            </span>
                          )}
                        </td>

                        {/* Paket Plan */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">
                              {tenant.plan?.name || "Standard Plan"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {tenant.plan?.priceMonthly
                                ? `${formatCurrency(tenant.plan.priceMonthly)} / bln`
                                : "Gratis / Demo"}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">{getStatusBadge(tenant.status)}</td>

                        {/* Sisa Waktu / Expired */}
                        <td className="py-3.5 px-4">{renderExpiryInfo(tenant)}</td>

                        {/* Total Router & Pelanggan */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-slate-200 font-medium flex items-center gap-1">
                              <Router className="w-3 h-3 text-purple-400" />
                              <span>{tenant.totalRouters} MikroTik</span>
                            </span>
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>{tenant.totalCustomers} Pelanggan</span>
                            </span>
                          </div>
                        </td>

                        {/* Aksi Dropdown */}
                        <td className="py-3.5 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-slate-900 border-slate-800 text-slate-200 shadow-xl"
                            >
                              <DropdownMenuLabel className="text-[11px] font-semibold text-slate-400">
                                Aksi Tenant: {tenant.name}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-800" />

                              {/* 1. Buka Portal Tenant */}
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `http://${tenant.slug}.euginebill.com:3000/customer`,
                                    "_blank"
                                  )
                                }
                                className="text-xs cursor-pointer hover:bg-slate-800 focus:bg-slate-800 flex items-center gap-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                <span>Buka Portal Tenant</span>
                              </DropdownMenuItem>

                              {/* 2. Impersonate SuperAdmin */}
                              <DropdownMenuItem
                                onClick={() => handleImpersonate(tenant)}
                                className="text-xs cursor-pointer hover:bg-blue-950/60 text-blue-300 focus:bg-blue-950/60 focus:text-blue-200 flex items-center gap-2"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                                <span>Impersonate SuperAdmin</span>
                              </DropdownMenuItem>

                              {/* 3. Perpanjang Trial / Langganan */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setIsExtendOpen(true);
                                }}
                                className="text-xs cursor-pointer hover:bg-slate-800 focus:bg-slate-800 flex items-center gap-2"
                              >
                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Perpanjang Langganan</span>
                              </DropdownMenuItem>

                              {/* 4. Reset Data Demo (Khusus DEMO) */}
                              {tenant.isDemo && (
                                <DropdownMenuItem
                                  onClick={() => handleResetDemo(tenant)}
                                  className="text-xs cursor-pointer hover:bg-purple-950/60 text-purple-300 focus:bg-purple-950/60 focus:text-purple-200 flex items-center gap-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Reset Data Demo (0%)</span>
                                </DropdownMenuItem>
                              )}

                              {/* 5. Suspend / Aktifkan */}
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(tenant)}
                                className="text-xs cursor-pointer hover:bg-slate-800 focus:bg-slate-800 flex items-center gap-2"
                              >
                                {tenant.status === "SUSPENDED" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Aktifkan Kembali</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Suspend Tenant</span>
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-slate-800" />

                              {/* 6. Hapus Tenant & Database */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setIsDeleteOpen(true);
                                }}
                                className="text-xs cursor-pointer hover:bg-red-950/60 text-red-400 focus:bg-red-950/60 focus:text-red-300 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                <span>Hapus Tenant & DB</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Tambah Tenant Baru */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Daftarkan Tenant ISP Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Buat subdomain instan dan alokasikan database terisolasi untuk ISP baru.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Nama ISP / Brand *</Label>
                <Input
                  type="text"
                  placeholder="Contoh: Nusantara Media Net"
                  value={newTenantName}
                  onChange={(e) => {
                    setNewTenantName(e.target.value);
                    if (!newTenantSlug) {
                      setNewTenantSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "-")
                          .replace(/-+/g, "-")
                      );
                    }
                  }}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Subdomain Slug *</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="nusantara-net"
                    value={newTenantSlug}
                    onChange={(e) =>
                      setNewTenantSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  URL: {newTenantSlug || "slug"}.euginebill.com
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Email Admin ISP *</Label>
                <Input
                  type="email"
                  placeholder="admin@nusantaranet.id"
                  value={newTenantEmail}
                  onChange={(e) => setNewTenantEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">No. WhatsApp / Kontak</Label>
                <Input
                  type="text"
                  placeholder="081234567890"
                  value={newTenantPhone}
                  onChange={(e) => setNewTenantPhone(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Paket Langganan</Label>
                <Select value={newTenantPlanId} onValueChange={setNewTenantPlanId}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9">
                    <SelectValue placeholder="Pilih paket..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({formatCurrency(p.priceMonthly)}/bln)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Status Awal</Label>
                <Select value={newTenantStatus} onValueChange={setNewTenantStatus}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="TRIAL" className="text-xs">
                      TRIAL (Free Trial 7 Hari)
                    </SelectItem>
                    <SelectItem value="ACTIVE" className="text-xs">
                      ACTIVE (Langganan Berbayar)
                    </SelectItem>
                    <SelectItem value="DEMO" className="text-xs">
                      DEMO (Sandbox Demo)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newTenantStatus === "TRIAL" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Durasi Trial (Hari)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={newTenantTrialDays}
                  onChange={(e) => setNewTenantTrialDays(Number(e.target.value) || 7)}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Catatan Internal</Label>
              <Input
                type="text"
                placeholder="Catatan profil ISP atau kontak teknis..."
                value={newTenantNotes}
                onChange={(e) => setNewTenantNotes(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="bg-slate-900 border-slate-800 text-slate-400 h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-medium cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  <>Daftarkan Tenant</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Perpanjang Masa Aktif */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Perpanjang Langganan Tenant</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Pilih masa perpanjangan untuk <strong className="text-white">{selectedTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status Saat Ini:</span>
                <span className="font-semibold text-white">{selectedTenant?.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subdomain:</span>
                <span className="font-mono text-blue-400">{selectedTenant?.slug}.euginebill.com</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Pilihan Opsi Perpanjangan:</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "+7 Hari", days: 7, desc: "Trial / Grace" },
                  { label: "+30 Hari", days: 30, desc: "1 Bulan Penuh" },
                  { label: "+1 Tahun", days: 365, desc: "365 Hari VIP" },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setExtendDays(opt.days)}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      extendDays === opt.days
                        ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="font-bold text-sm">{opt.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExtendOpen(false)}
              className="bg-slate-900 border-slate-800 text-slate-400 h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleExtend}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 text-xs font-medium cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Memproses...
                </>
              ) : (
                <>Konfirmasi Perpanjang (+{extendDays} Hari)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Hapus Tenant & Database */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-red-900/40 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Hapus Tenant & Database</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-300 space-y-2">
            <p>
              Apakah Anda yakin ingin menghapus tenant <strong>{selectedTenant?.name}</strong> (
              <span className="font-mono">{selectedTenant?.slug}.euginebill.com</span>)?
            </p>
            <p className="text-[11px] text-red-400 font-medium">
              Database schema <span className="font-mono">{selectedTenant?.databaseName}</span> dan seluruh riwayat langganan akan dihapus dari cluster.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="bg-slate-900 border-slate-800 text-slate-400 h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteTenant}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white h-9 text-xs font-medium cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Menghapus...
                </>
              ) : (
                <>Hapus Permanen</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
