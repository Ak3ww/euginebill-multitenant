"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Server,
  Layers,
  Package,
  LogOut,
  Activity,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Database,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SaaSAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/saas-admin/login";

  const [adminUser, setAdminUser] = useState<{
    name?: string | null;
    username: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoginPage) {
      fetch("/api/saas-admin/auth/me")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Unauthenticated");
        })
        .then((data) => {
          if (data.authenticated && data.user) {
            setAdminUser(data.user);
          }
        })
        .catch(() => {
          // If auth fails on protected route, redirect to login
          // router.push("/saas-admin/login");
        });
    }
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/saas-admin/auth/logout", { method: "POST" });
      router.push("/saas-admin/login");
      router.refresh();
    } catch {
      router.push("/saas-admin/login");
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    {
      name: "Tenant Directory",
      href: "/saas-admin",
      icon: Layers,
      active: pathname === "/saas-admin",
    },
    {
      name: "Paket Langganan",
      href: "/saas-admin/plans",
      icon: Package,
      active: pathname.startsWith("/saas-admin/plans"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Global Master Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Badge */}
          <div className="flex items-center gap-6">
            <Link
              href="/saas-admin"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Server className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                  EugineBill <span className="text-blue-400 font-normal">SaaS Master</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                  Cluster Subdomain Router
                </span>
              </div>
            </Link>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      item.active
                        ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* System Operational Status */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-[11px] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Edge Routing Online</span>
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">
                  {adminUser?.name || adminUser?.username || "SuperAdmin"}
                </span>
                <span className="text-[10px] text-blue-400 font-mono">
                  ROOT PRIVILEGE
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-300 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2.5 bg-slate-900 border-slate-800 hover:bg-red-950/40 hover:border-red-800/50 hover:text-red-300 text-slate-400 text-xs gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Multi-Tenant Architecture v2.4 • Dynamic MySQL Isolation & Edge Subdomain</span>
          </div>
          <div className="text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} Eugine Media Group &bull; All Rights Reserved &bull; Powered by{' '}
            <a
              href="https://euginemediagroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold text-blue-400"
            >
              Eugine Media Group
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
