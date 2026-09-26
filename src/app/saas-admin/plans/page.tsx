"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  Router,
  Users,
  Ticket,
  Sparkles,
  TrendingUp,
  Layers,
  Loader2,
  RefreshCw,
  Building2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type Plan = {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  maxRouters: number;
  maxUsers: number;
  maxVouchers: number;
  features: string[] | any;
  isPopular: boolean;
  isActive: boolean;
  _count?: { tenants: number };
};

export default function SaaSPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formPriceMonthly, setFormPriceMonthly] = useState(0);
  const [formPriceYearly, setFormPriceYearly] = useState(0);
  const [formMaxRouters, setFormMaxRouters] = useState(1);
  const [formMaxUsers, setFormMaxUsers] = useState(250);
  const [formMaxVouchers, setFormMaxVouchers] = useState(1000);
  const [formFeatures, setFormFeatures] = useState<string>("");
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchPlans = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/saas-admin/plans");
      const data = await res.json();
      if (res.ok && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
      toast({
        title: "Gagal Memuat Paket",
        description: "Tidak dapat mengambil daftar paket langganan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormName("");
    setFormCode("");
    setFormPriceMonthly(199000);
    setFormPriceYearly(1990000);
    setFormMaxRouters(1);
    setFormMaxUsers(250);
    setFormMaxVouchers(1000);
    setFormFeatures(
      "1 MikroTik Router Sync\nMaksimal 250 Pelanggan PPPoE\n1.000 Voucher Hotspot / bln\nWhatsApp Gateway & Isolasi Otomatis"
    );
    setFormIsPopular(false);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCode(plan.code);
    setFormPriceMonthly(plan.priceMonthly);
    setFormPriceYearly(plan.priceYearly);
    setFormMaxRouters(plan.maxRouters);
    setFormMaxUsers(plan.maxUsers);
    setFormMaxVouchers(plan.maxVouchers);
    setFormFeatures(
      Array.isArray(plan.features) ? plan.features.join("\n") : ""
    );
    setFormIsPopular(plan.isPopular);
    setFormIsActive(plan.isActive);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) {
      toast({
        title: "Validasi Gagal",
        description: "Nama dan kode paket wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    const parsedFeatures = formFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const payload = {
      name: formName,
      code: formCode,
      priceMonthly: Number(formPriceMonthly),
      priceYearly: Number(formPriceYearly),
      maxRouters: Number(formMaxRouters),
      maxUsers: Number(formMaxUsers),
      maxVouchers: Number(formMaxVouchers),
      features: parsedFeatures,
      isPopular: formIsPopular,
      isActive: formIsActive,
    };

    try {
      const url = editingPlan
        ? `/api/saas-admin/plans/${editingPlan.id}`
        : "/api/saas-admin/plans";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan paket langganan.");
      }

      toast({
        title: "Paket Tersimpan",
        description: data.message,
      });

      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast({
        title: "Error Menyimpan Paket",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-500" />
            <span>Manajemen Paket Langganan SaaS</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasi batas kuota router MikroTik, kuota pelanggan, batas voucher hotspot, dan penetapan harga bulanan/tahunan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlans}
            disabled={refreshing}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 h-9 font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Paket Baru
          </Button>
        </div>
      </div>

      {/* Plan Grid Cards */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Memuat katalog paket langganan...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];
            return (
              <Card
                key={plan.id}
                className={`bg-slate-900/90 border-slate-800 flex flex-col justify-between relative transition-all duration-200 hover:border-slate-700 ${
                  plan.isPopular ? "border-blue-500/60 ring-1 ring-blue-500/30" : ""
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white font-semibold text-[10px] uppercase px-2.5 py-0.5 shadow-md">
                      Paling Populer
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3 pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-white">
                      {plan.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-400"
                    >
                      {plan.code}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    {plan.maxRouters} Router MikroTik • {plan.maxUsers} Pelanggan
                  </CardDescription>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        {formatCurrency(plan.priceMonthly)}
                      </span>
                      <span className="text-xs text-slate-400">/ bulan</span>
                    </div>
                    {plan.priceYearly > 0 && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        atau {formatCurrency(plan.priceYearly)} / tahun
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pb-4">
                  {/* Resource Badges */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Router className="w-3.5 h-3.5 text-blue-400" />
                      <span>{plan.maxRouters} MikroTik</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>{plan.maxUsers} Users</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                      <Ticket className="w-3.5 h-3.5 text-amber-400" />
                      <span>{plan.maxVouchers.toLocaleString()} Vouchers / bln</span>
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Fitur Utama:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{plan._count?.tenants || 0} Tenant Aktif</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(plan)}
                    className="h-8 px-3 bg-slate-950 border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-blue-400" />
                    <span>Edit Kuota</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Tambah / Edit Paket */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>{editingPlan ? "Edit Paket Langganan" : "Buat Paket Langganan Baru"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tentukan harga dan alokasi batas kapasitas router MikroTik & pengguna.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Nama Paket *</Label>
                <Input
                  type="text"
                  placeholder="Contoh: Pro ISP"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingPlan && !formCode) {
                      setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                    }
                  }}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Kode Slug *</Label>
                <Input
                  type="text"
                  placeholder="pro"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Harga Bulanan (Rp) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={formPriceMonthly}
                  onChange={(e) => setFormPriceMonthly(Number(e.target.value) || 0)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Harga Tahunan (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={formPriceYearly}
                  onChange={(e) => setFormPriceYearly(Number(e.target.value) || 0)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Resource Limits */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Max Router</Label>
                <Input
                  type="number"
                  min={1}
                  value={formMaxRouters}
                  onChange={(e) => setFormMaxRouters(Number(e.target.value) || 1)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Max Users</Label>
                <Input
                  type="number"
                  min={10}
                  value={formMaxUsers}
                  onChange={(e) => setFormMaxUsers(Number(e.target.value) || 100)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Max Voucher</Label>
                <Input
                  type="number"
                  min={50}
                  value={formMaxVouchers}
                  onChange={(e) => setFormMaxVouchers(Number(e.target.value) || 500)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Features (One per line) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Daftar Fitur (1 baris per fitur)</Label>
              <textarea
                rows={4}
                value={formFeatures}
                onChange={(e) => setFormFeatures(e.target.value)}
                placeholder="Contoh:&#10;5 MikroTik Router Sync&#10;Maksimal 1.500 Pelanggan&#10;GenieACS Auto Provisioning"
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
            </div>

            {/* Popular toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPopular"
                checked={formIsPopular}
                onChange={(e) => setFormIsPopular(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <Label htmlFor="isPopular" className="text-xs text-slate-300 cursor-pointer">
                Tandai sebagai paket <strong>Paling Populer</strong>
              </Label>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
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
                  <>Simpan Paket</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
