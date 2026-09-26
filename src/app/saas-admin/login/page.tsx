"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Server,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  Globe2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SaaSAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Silakan masukkan username dan password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/saas-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login gagal. Periksa kembali kredensial Anda.");
      }

      router.push("/saas-admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-900/30 border border-blue-700/40 text-blue-400 mb-2 shadow-inner">
            <Server className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            EugineBill SaaS Master
            <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-950/50 text-[10px] py-0 px-2">
              EDGE ROOT
            </Badge>
          </h1>
          <p className="text-sm text-slate-400">
            Portal Administrasi Multi-Tenant & Manajemen Cluster ISP
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800/80 bg-slate-900/90 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
              <span>SuperAdmin Authentication</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Masukkan kredensial master root untuk mengakses kontrol tenant.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-2">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-300">Username / Master Email</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="superadmin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-10 text-sm"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-300">Master Password</Label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-10 text-sm font-mono"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/40 border border-slate-800/80 p-3 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Default Root Access Credentials:</span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 pl-5">
                  User: <span className="text-blue-300 font-semibold">superadmin</span> | Pass: <span className="text-blue-300 font-semibold">EugineBill2026!</span>
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-10 shadow-lg shadow-blue-600/20 cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Memverifikasi Sesi...
                  </>
                ) : (
                  <>
                    Masuk ke Master Portal
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
                <Globe2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Multi-Subdomain Cluster Gateway • Next.js Edge Ready</span>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} EugineBill Multi-Tenant System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
