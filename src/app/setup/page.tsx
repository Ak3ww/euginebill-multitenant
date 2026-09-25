'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Server,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldAlert,
  Package,
  Users,
  Smartphone,
  CreditCard,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Building2,
  Globe,
  Radio,
  Cable,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers,
  Lock,
  KeyRound,
  Info,
  Sliders,
  ChevronRight,
  Send,
  HelpCircle,
  UserCheck,
  ShieldCheck,
  Loader2,
  LogIn,
  User,
  Mail,
  MapPin,
  Activity,
  LayoutDashboard,
  Eye,
  EyeOff,
  Cpu,
  Plus,
  Trash2,
  Edit,
  QrCode,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { copyToClipboard } from '@/lib/clipboard';

interface CompanyData {
  name: string;
  phone: string;
  adminPhone: string;
  baseUrl: string;
  address: string;
  email: string;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  diagnosis?: string;
  usedPort?: number;
  fixScript?: string;
}

interface CreatedProfile {
  id: string;
  name: string;
  groupName: string;
  price: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

interface CreatedUser {
  id?: string;
  username: string;
  name: string;
  phone: string;
  invoiceNumber?: string;
}

const ALL_STEPS = [
  { id: 0, title: 'Inisialisasi Sistem', icon: ShieldCheck, desc: 'Akun Superadmin & ISP' },
  { id: 1, title: 'Profil & Kontak ISP', icon: Building2, desc: 'Identitas & Footer Login' },
  { id: 2, title: 'Client VPN Setup', icon: Cable, desc: 'WireGuard / L2TP Tunnel' },
  { id: 3, title: 'Koneksi MikroTik', icon: Server, desc: 'API Router & Credentials' },
  { id: 4, title: 'Sistem Isolir', icon: Shield, desc: 'Firewall & Web Proxy 8080' },
  { id: 5, title: 'Paket PPPoE', icon: Package, desc: 'Tarif & Kecepatan' },
  { id: 6, title: 'Pelanggan Trial', icon: Users, desc: 'Akun Tes PPPoE' },
  { id: 7, title: 'Payment Gateway', icon: CreditCard, desc: 'Bank, QRIN & Gateway' },
  { id: 8, title: 'Bot WhatsApp', icon: Smartphone, desc: 'Notifikasi Otomatis' },
  { id: 9, title: 'RADIUS Server', icon: Radio, desc: 'Switch Auth & Port 1812/1813' },
  { id: 10, title: 'TR-069 & GenieACS', icon: Globe, desc: 'Auto Config ONT (VLAN 4000)' },
  { id: 11, title: 'Tim & SPK', icon: UserCheck, desc: 'Akun Teknisi & Role' },
  { id: 12, title: 'Peluncuran Sistem', icon: Sparkles, desc: 'Turnkey Readiness Recap' },
];

export default function UnifiedSetupWizardPage() {
  const router = useRouter();
  const sessionContext = useSession();
  const session = sessionContext?.data;
  const sessionStatus = sessionContext?.status || 'unauthenticated';

  // Force Light Mode by Default for Admin & Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, []);

  // Initialization check state
  const [checkingInit, setCheckingInit] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Uninitialized First-Run State (Step 0)
  const [initStep, setInitStep] = useState(1);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initFormData, setInitFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    baseUrl: '',
    timezone: 'Asia/Jakarta',
    adminUsername: 'admin',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    customerIdPrefix: 'EB-',
    fixedBillingDate: '20',
  });

  // Post-Initialization Wizard State (Steps 0 - 6)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [radiusEnabled, setRadiusEnabled] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [hasExistingData, setHasExistingData] = useState<boolean>(false);
  const [existingStats, setExistingStats] = useState<{ routerCount: number; userCount: number }>({
    routerCount: 0,
    userCount: 0,
  });

  // Step 1: Company Profile State
  const [companyForm, setCompanyForm] = useState<CompanyData>({
    name: 'PT Eugine Solusi Internet',
    phone: '081234567890',
    adminPhone: '081234567890',
    baseUrl: 'https://billing.isp.net',
    address: 'Jl. Protokol Telekomunikasi No. 88, Jakarta',
    email: 'admin@isp.net',
  });

  // Set window origin safely post-mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin;
      setInitFormData((prev) => ({ ...prev, baseUrl: prev.baseUrl || origin }));
      setCompanyForm((prev) => ({
        ...prev,
        baseUrl: prev.baseUrl === 'https://billing.isp.net' ? origin : prev.baseUrl,
      }));
    }
  }, []);

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  // Step 2: Router MikroTik State
  const [connectionMethod, setConnectionMethod] = useState<'wireguard' | 'l2tp' | 'direct'>('wireguard');
  const [vpnClients, setVpnClients] = useState<any[]>([]);
  const [useVpnClient, setUseVpnClient] = useState(false);
  const [vpnClientSaved, setVpnClientSaved] = useState(false);
  const [isSavingVpnClient, setIsSavingVpnClient] = useState(false);
  const [createdVpnClient, setCreatedVpnClient] = useState<any>(null);
  const [routerForm, setRouterForm] = useState({
    name: 'MikroTik-Utama',
    type: 'mikrotik',
    ipAddress: '10.254.1.2',
    nasname: '10.254.1.2',
    autoAssignIp: true,
    allowedIps: '',
    port: '8728',
    winboxPort: '8291',
    wwwPort: '80',
    username: 'api-mikrotik-admin',
    password: 'EB@ApiSecret2026',
    secret: 'secret123',
    authMode: 'local',
    vpnClientId: '',
  });
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTestingRouter, setIsTestingRouter] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isSavingRouter, setIsSavingRouter] = useState(false);
  const [routerSaved, setRouterSaved] = useState(false);
  const [savedRouterId, setSavedRouterId] = useState<string | null>(null);

  // Step 3: Isolation Settings State
  const [isolationForm, setIsolationForm] = useState({
    isolationEnabled: true,
    isolationIpPool: '192.168.200.0/24',
    isolationServerIp: '43.173.14.236',
    isolationRateLimit: '64k/64k',
    isolationRedirectUrl: '',
    isolationMessage: 'Akun Anda telah diisolir karena masa berlangganan habis. Silakan lakukan pembayaran untuk mengaktifkan kembali layanan.',
    isolationAllowDns: true,
    isolationAllowPayment: true,
    isolationNotifyWhatsapp: true,
    isolationNotifyEmail: false,
    gracePeriodDays: 0,
  });
  const [isolationRosVersion, setIsolationRosVersion] = useState<'ros7' | 'ros6'>('ros7');
  const [isolationAuthMode, setIsolationAuthMode] = useState<'local' | 'radius'>('local');
  const [isSavingIsolation, setIsSavingIsolation] = useState(false);

  const handleVpnClientChange = (vpnClientId: string) => {
    if (vpnClientId) {
      const vpnClient = vpnClients.find((v) => v.id === vpnClientId);
      if (vpnClient) {
        const vpnApiTarget = vpnClient.publicPorts?.services?.api?.target?.toString();
        const vpnWinboxTarget = vpnClient.publicPorts?.services?.winbox?.target?.toString();
        setRouterForm((prev) => ({
          ...prev,
          vpnClientId,
          ipAddress: vpnClient.vpnIp,
          nasname: vpnClient.vpnIp,
          username: vpnClient.resolvedUsername || prev.username,
          password: vpnClient.resolvedPassword || prev.password,
          secret: vpnClient.nasSecret || prev.secret,
          ...(vpnApiTarget ? { port: vpnApiTarget } : {}),
          ...(vpnWinboxTarget ? { winboxPort: vpnWinboxTarget } : {}),
        }));
      }
    } else {
      setRouterForm((prev) => ({ ...prev, vpnClientId: '', ipAddress: '', nasname: '' }));
    }
  };

  // Step 3: PPPoE Profile State
  const [profileForm, setProfileForm] = useState({
    name: 'Home 20 Mbps',
    groupName: 'Home 20 Mbps',
    downloadSpeed: '20',
    uploadSpeed: '20',
    speedUnit: 'Mbps' as 'Mbps' | 'Kbps',
    price: '200000',
    hpp: '100000',
    proratePricePerDay: '6666',
    ppnActive: false,
    validityValue: '1',
    validityUnit: 'MONTHS' as 'MONTHS' | 'DAYS',
    description: 'Paket Internet Rumah Uncapped Unlimited 20 Mbps',
    ipPoolName: '',
    localAddress: '',
    sharedUser: true,
    isActive: true,
    creationMode: 'new' as 'new' | 'existing',
    selectedMikrotikProfile: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<CreatedProfile | null>(null);

  const [routerResources, setRouterResources] = useState<{
    pools: { name: string; ranges: string }[];
    profiles: { name: string; rateLimit: string; localAddress: string; remoteAddress: string; onlyOne: string }[];
    addresses: { address: string; ip: string; interface: string; network: string; comment: string }[];
  }>({ pools: [], profiles: [], addresses: [] });
  const [loadingResources, setLoadingResources] = useState(false);

  // Step 4: Trial Customer State
  const [customerForm, setCustomerForm] = useState({
    name: 'Pelanggan Percobaan',
    phone: '081298765432',
    username: 'trial01',
    password: 'secret@user123',
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<CreatedUser | null>(null);

  // Step 5: WhatsApp Bot State
  const [waLoading, setWaLoading] = useState(false);
  const [waProviders, setWaProviders] = useState<any[]>([]);
  const [waConnected, setWaConnected] = useState(false);
  const [waStatusesMap, setWaStatusesMap] = useState<Record<string, any>>({});
  const [showWaModal, setShowWaModal] = useState(false);
  const [editingWaProvider, setEditingWaProvider] = useState<any | null>(null);
  const [waFormData, setWaFormData] = useState({
    name: 'Bot Utama Baileys',
    type: 'baileys',
    apiUrl: 'internal',
    apiKey: 'internal',
    senderNumber: '',
    priority: 1,
    description: 'WhatsApp Gateway Baileys Multi-Device',
  });
  const [showWaQrModal, setShowWaQrModal] = useState(false);
  const [waQrProvider, setWaQrProvider] = useState<any | null>(null);
  const [waQrImage, setWaQrImage] = useState<string | null>(null);
  const [waQrLoading, setWaQrLoading] = useState(false);
  const [waQrConnected, setWaQrConnected] = useState(false);
  const [waQrPollingRef, setWaQrPollingRef] = useState<ReturnType<typeof setInterval> | null>(null);
  const [restartingWaProvider, setRestartingWaProvider] = useState<string | null>(null);

  // Step 6: Payment Gateway State
  const [bankAccounts, setBankAccounts] = useState<Array<{ bankName: string; accountNumber: string; accountName: string }>>([
    { bankName: 'BCA', accountNumber: '1234567890', accountName: 'PT Eugine Solusi Internet' }
  ]);
  const [paymentForm, setPaymentForm] = useState({
    bankName: 'BCA',
    accountNumber: '1234567890',
    accountName: 'PT Eugine Solusi Internet',
    gatewayProvider: 'manual' as 'manual' | 'midtrans' | 'tripay' | 'xendit' | 'duitku' | 'qrin' | 'ipaymu',
    merchantCode: '',
    apiKey: '',
    webhookSecret: '',
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Additional Wizard Steps State (Steps 3, 8, 9, 10, 11)
  const [copiedIsolirScript, setCopiedIsolirScript] = useState(false);
  const [radiusForm, setRadiusForm] = useState({
    radiusEnabled: false,
    radiusSecret: 'secret123',
    nasIp: '10.254.1.2',
  });
  const [isSavingRadius, setIsSavingRadius] = useState(false);
  const [copiedAcsScript, setCopiedAcsScript] = useState(false);
  const [oltVariant, setOltVariant] = useState<'v1600gs_zf' | 'v1600gs_std'>('v1600gs_zf');
  const [copiedOltScript, setCopiedOltScript] = useState(false);
  const [techForm, setTechForm] = useState({
    name: 'Teknisi Lapangan 1',
    username: 'teknisi01',
    password: 'tech@password123',
    phone: '081234567891',
  });
  const [isSavingTech, setIsSavingTech] = useState(false);
  const [techSaved, setTechSaved] = useState(false);

  // Read step from URL query param if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const targetStep = urlParams.get('step');
      if (targetStep !== null) {
        const parsed = parseInt(targetStep);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) {
          setCurrentStep(parsed);
        }
      }
    }
  }, []);

  // Check system initialization
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/setup');
        const data = await res.json();
        const init = Boolean(data.isInitialized);
        setIsInitialized(init);
        setCurrentStep(init ? 1 : 0);
      } catch (err) {
        console.error('Failed checking setup status:', err);
      } finally {
        setCheckingInit(false);
      }
    }
    checkSetup();
  }, []);

  // Fetch company, router, user, and wa data when authenticated
  useEffect(() => {
    if (!isInitialized || sessionStatus !== 'authenticated') return;

    async function loadData() {
      setIsLoadingData(true);
      try {
        const [companyRes, routersRes, usersRes, waRes, profilesRes] = await Promise.allSettled([
          fetch('/api/company'),
          fetch('/api/network/routers'),
          fetch('/api/pppoe/users'),
          fetch('/api/whatsapp/providers'),
          fetch('/api/pppoe/profiles'),
        ]);

        let rCount = 0;
        let uCount = 0;
        const newCompletedSteps: number[] = [];

        if (companyRes.status === 'fulfilled' && companyRes.value.ok) {
          const cData = await companyRes.value.json();
          if (cData) {
            setRadiusEnabled(Boolean(cData.radiusEnabled));
            const defaultNames = ['PT Eugine Solusi Internet', 'EugineBill RADIUS', 'EugineBill', ''];
            const isCustomizedCompany = Boolean(cData.name && !defaultNames.includes(cData.name.trim()));
            setCompanyForm((prev) => ({
              ...prev,
              name: cData.name || prev.name,
              phone: cData.phone || prev.phone,
              adminPhone: cData.adminPhone || cData.phone || prev.adminPhone,
              baseUrl: cData.baseUrl || (typeof window !== 'undefined' ? window.location.origin : prev.baseUrl),
              address: cData.address || prev.address,
              email: cData.email || prev.email,
            }));
            if (isCustomizedCompany) {
              setCompanySaved(true);
              newCompletedSteps.push(1);
            }
          }
        }

        if (routersRes.status === 'fulfilled' && routersRes.value.ok) {
          const rData = await routersRes.value.json();
          const routers = rData.routers || (Array.isArray(rData) ? rData : []);
          rCount = routers.length;
          if (routers.length > 0) {
            setSavedRouterId(routers[0].id);
            setRouterForm((prev) => ({
              ...prev,
              name: routers[0].name || prev.name,
              ipAddress: routers[0].ipAddress || routers[0].nasname || prev.ipAddress,
              username: routers[0].username || prev.username,
              port: String(routers[0].port || routers[0].apiPort || 8728),
            }));
            setRouterSaved(true);
            newCompletedSteps.push(2);
          }
        }

        if (profilesRes.status === 'fulfilled' && profilesRes.value.ok) {
          const pData = await profilesRes.value.json();
          const profiles = pData.profiles || (Array.isArray(pData) ? pData : []);
          if (profiles.length > 0) {
            newCompletedSteps.push(4);
          }
        }

        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const uData = await usersRes.value.json();
          const users = uData.users || (Array.isArray(uData) ? uData : []);
          uCount = users.length;
          if (uCount > 0) {
            newCompletedSteps.push(5);
          }
        }

        if (waRes.status === 'fulfilled' && waRes.value.ok) {
          const wData = await waRes.value.json();
          if (Array.isArray(wData) && wData.length > 0) {
            setWaProviders(wData);
            const active = wData.some((p: any) => p.isActive);
            setWaConnected(active);
            if (active) newCompletedSteps.push(7);
          }
        }

        setCompletedSteps(Array.from(new Set(newCompletedSteps)));
        setExistingStats({ routerCount: rCount, userCount: uCount });
        if (rCount > 0 || uCount > 0) {
          setHasExistingData(true);
        }
      } catch (err) {
        console.error('Failed loading wizard data:', err);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [isInitialized, sessionStatus]);

  // Generate RouterOS script using REAL VPS IP/Host
  useEffect(() => {
    const port = routerForm.port || '8728';
    const winbox = routerForm.winboxPort || '8291';
    const www = routerForm.wwwPort || '80';
    const u = routerForm.username || 'euginebill_api';
    const p = routerForm.password || 'EB@ApiSecret2026';
    const ip = routerForm.ipAddress || '10.254.1.2';
    const nasName = routerForm.name || 'MikroTik-Router';
    const safeLabel = nasName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 12) || 'vpn';

    // Resolve real VPS Host IP
    let vpsHost = '43.173.14.236';
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      vpsHost = window.location.hostname;
    } else if (companyForm.baseUrl) {
      try {
        const parsedUrl = new URL(companyForm.baseUrl);
        if (parsedUrl.hostname && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
          vpsHost = parsedUrl.hostname;
        }
      } catch (e) {
        // ignore
      }
    }

    let script = `# ========================================================\n`;
    script += `# SKRIP SETUP MIKROTIK UNTUK EUGINEBILL\n`;
    script += `# Metode Koneksi: ${connectionMethod.toUpperCase()}\n`;
    script += `# Router        : ${nasName} (IP: ${ip})\n`;
    script += `# VPS Server    : ${vpsHost}\n`;
    script += `# Port API      : ${port} | Winbox: ${winbox} | WWW: ${www}\n`;
    script += `# ========================================================\n\n`;

    if (connectionMethod === 'wireguard') {
      const ifaceName = `ebwg-${safeLabel}`;
      script += `# --- 1. Konfigurasi WireGuard Client (Tunnel Aman VPS) ---\n`;
      script += `:do { /interface wireguard remove [find comment~"EugineBill"] } on-error={}\n`;
      script += `:do { /interface wireguard remove [find name="${ifaceName}"] } on-error={}\n`;
      script += `/interface wireguard add listen-port=13231 name=${ifaceName} comment="EugineBill WireGuard"\n`;
      script += `/ip address add address=${ip}/24 interface=${ifaceName} comment="EugineBill VPN IP"\n`;
      script += `/interface wireguard peers add interface=${ifaceName} endpoint-address="${vpsHost}" endpoint-port=51820 allowed-address=10.200.0.0/24,${routerForm.allowedIps || '10.200.0.0/24'} persistent-keepalive=25s comment="VPS EugineBill Server"\n\n`;
    } else if (connectionMethod === 'l2tp') {
      const ifaceName = `ebl2-${safeLabel}`;
      script += `# --- 1. Konfigurasi L2TP Client (UltraVPN Standard) ---\n`;
      script += `:do { /interface l2tp-client remove [find comment~"EugineBill"] } on-error={}\n`;
      script += `:do { /interface l2tp-client remove [find name="${ifaceName}"] } on-error={}\n`;
      script += `:if ([:len [/ppp profile find name="ebvpn-remote"]] = 0) do={\n`;
      script += `    /ppp profile add name=ebvpn-remote use-encryption=no change-tcp-mss=yes only-one=no\n`;
      script += `}\n`;
      script += `/interface l2tp-client add name=${ifaceName} connect-to="${vpsHost}" user="${u}" password="${p}" profile=ebvpn-remote use-ipsec=no allow=chap,mschap2 disabled=no add-default-route=no dial-on-demand=no comment="EugineBill L2TP"\n\n`;
    }

    script += `# --- 2. Buat Group Akses Khusus API & Winbox ---\n`;
    script += `:do { /user group add name=api-users policy=read,write,policy,test,sensitive,api,winbox,password,local,web,ssh comment="API Access EugineBill" } on-error={}\n`;
    script += `:do { /user group set [find name="api-users"] policy=read,write,policy,test,sensitive,api,winbox,password,local,web,ssh } on-error={}\n\n`;

    script += `# --- 3. Buat User API MikroTik ---\n`;
    script += `:do { /user remove [find name="${u}"] } on-error={}\n`;
    script += `/user add name="${u}" group=api-users password="${p}" comment="API User EugineBill"\n\n`;

    script += `# --- 4. Aktifkan Service Port API & Winbox & Web ---\n`;
    script += `:do { /ip service set api port=${port} address="" disabled=no } on-error={}\n`;
    script += `:do { /ip service set winbox port=${winbox} address="" disabled=no } on-error={}\n`;
    script += `:do { /ip service set www port=${www} address="" disabled=no } on-error={}\n\n`;

    script += `# --- 5. Buka Akses Firewall Filter di Posisi Teratas ---\n`;
    script += `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=${port},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}\n`;
    if (connectionMethod === 'wireguard') {
      script += `:do { /ip firewall filter add chain=input action=accept in-interface=ebwg-${safeLabel} place-before=0 comment="Allow EugineBill WG VPN" } on-error={}\n`;
    } else if (connectionMethod === 'l2tp') {
      script += `:do { /ip firewall filter add chain=input action=accept in-interface=ebl2-${safeLabel} place-before=0 comment="Allow EugineBill L2TP VPN" } on-error={}\n`;
    }

    script += `\n# ========================================================\n`;
    script += `# SELESAI! Salin dan Tempel skrip ini di Terminal Winbox MikroTik Anda.\n`;
    script += `# ========================================================`;

    setGeneratedScript(script);
  }, [connectionMethod, routerForm, companyForm.baseUrl]);

  const markStepCompleted = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps((prev) => [...prev, stepNumber]);
    }
  };

  // First-Run Initial System Setup Handler (Step 0)
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitSubmitting(true);
    setInitError(null);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan inisialisasi.');
      }

      // Automatically sign in superadmin credential
      const authRes = await signIn('credentials', {
        redirect: false,
        username: initFormData.adminUsername,
        password: initFormData.adminPassword,
      });

      if (authRes?.error) {
        router.push('/admin/login?setup=success&callbackUrl=/setup');
        return;
      }

      setIsInitialized(true);
      markStepCompleted(0);
      setCurrentStep(1);
    } catch (err: any) {
      setInitError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setInitSubmitting(false);
    }
  };

  // Step 1: Save Company Profile
  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan profil perusahaan');
      }

      setCompanySaved(true);
      markStepCompleted(1);
      setCurrentStep(2);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan profil');
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Step 2: Save VPN Client
  const handleSaveVpnClient = async () => {
    setIsSavingVpnClient(true);
    try {
      const res = await fetch('/api/network/vpn-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routerForm.name,
          vpnProtocol: connectionMethod === 'wireguard' ? 'wireguard' : 'l2tp',
          allowedIps: routerForm.allowedIps || undefined,
          vpnIp: routerForm.autoAssignIp ? undefined : routerForm.ipAddress,
          targetPorts: {
            winbox: parseInt(routerForm.winboxPort) || 8291,
            api: parseInt(routerForm.port) || 8728,
            www: parseInt(routerForm.wwwPort) || 80,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.vpnClient) {
        setCreatedVpnClient(data.vpnClient);
        setVpnClientSaved(true);
        if (data.vpnClient.vpnIp) {
          setRouterForm((prev) => ({
            ...prev,
            vpnClientId: data.vpnClient.id,
            ipAddress: data.vpnClient.vpnIp,
            nasname: data.vpnClient.vpnIp,
            username: data.vpnClient.resolvedUsername || prev.username,
            password: data.vpnClient.resolvedPassword || prev.password,
            secret: data.vpnClient.nasSecret || prev.secret,
          }));
        }
      } else {
        setVpnClientSaved(true);
      }
      markStepCompleted(2);
    } catch (err) {
      console.error('Failed to save VPN Client:', err);
      setVpnClientSaved(true);
      markStepCompleted(2);
    } finally {
      setIsSavingVpnClient(false);
    }
  };

  // Step 3: Test & Save Router
  const handleTestRouter = async () => {
    setIsTestingRouter(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/network/routers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: routerForm.ipAddress,
          username: routerForm.username,
          password: routerForm.password,
          port: parseInt(routerForm.port) || 8728,
        }),
      });

      const data: TestConnectionResult = await res.json();
      setTestResult(data);

      if (data.success) {
        if (data.usedPort && data.usedPort !== parseInt(routerForm.port)) {
          setRouterForm((prev) => ({ ...prev, port: String(data.usedPort) }));
        }
        await handleSaveRouter();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Koneksi ke MikroTik gagal / timeout',
        diagnosis: 'network_error',
      });
    } finally {
      setIsTestingRouter(false);
    }
  };

  const handleSaveRouter = async () => {
    setIsSavingRouter(true);
    try {
      const res = await fetch('/api/network/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routerForm.name,
          ipAddress: routerForm.ipAddress,
          nasname: routerForm.ipAddress,
          username: routerForm.username,
          password: routerForm.password,
          port: parseInt(routerForm.port) || 8728,
          winboxPort: parseInt(routerForm.winboxPort) || 8291,
          wwwPort: parseInt(routerForm.wwwPort) || 80,
          secret: routerForm.secret || 'secret123',
          authMode: routerForm.authMode || 'local',
          allowedIps: routerForm.allowedIps || undefined,
          vpnClientId: routerForm.vpnClientId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.router) {
        setSavedRouterId(data.router.id);
        setRouterSaved(true);
        markStepCompleted(3);
        setCurrentStep(4);
      } else if (res.status === 409) {
        setRouterSaved(true);
        markStepCompleted(3);
        setCurrentStep(4);
      }
    } catch (err) {
      console.error('Failed to save router:', err);
    } finally {
      setIsSavingRouter(false);
    }
  };

  // Step 4: Save Isolation Settings
  const handleSaveIsolationSettings = async () => {
    setIsSavingIsolation(true);
    try {
      const res = await fetch('/api/settings/isolation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isolationForm),
      });

      const data = await res.json();
      if (data.success) {
        markStepCompleted(4);
        setCurrentStep(5);
      } else {
        throw new Error(data.error || 'Gagal menyimpan sistem isolir');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan sistem isolir');
    } finally {
      setIsSavingIsolation(false);
    }
  };

  // Step 5: Fetch Router Resources for PPPoE Profile
  useEffect(() => {
    if (currentStep === 5 && savedRouterId) {
      const fetchResources = async () => {
        setLoadingResources(true);
        try {
          const res = await fetch(`/api/network/routers/${savedRouterId}/resources`);
          const data = await res.json();
          if (data.success) {
            setRouterResources({
              pools: Array.isArray(data.pools) ? data.pools : [],
              profiles: Array.isArray(data.profiles) ? data.profiles : [],
              addresses: Array.isArray(data.addresses) ? data.addresses : [],
            });
            if (data.pools?.length > 0 && !profileForm.ipPoolName) {
              setProfileForm((prev) => ({ ...prev, ipPoolName: data.pools[0].name }));
            }
          }
        } catch (e) {
          console.error('Failed to load router resources in setup:', e);
        } finally {
          setLoadingResources(false);
        }
      };
      fetchResources();
    }
  }, [currentStep, savedRouterId]);

  // Step 5: Save PPPoE Profile
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const dlSpeed = profileForm.speedUnit === 'Kbps' ? Math.ceil(parseInt(profileForm.downloadSpeed) / 1000) || 1 : parseInt(profileForm.downloadSpeed) || 20;
      const ulSpeed = profileForm.speedUnit === 'Kbps' ? Math.ceil(parseInt(profileForm.uploadSpeed) / 1000) || 1 : parseInt(profileForm.uploadSpeed) || 20;

      const res = await fetch('/api/pppoe/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          groupName: profileForm.groupName || profileForm.name,
          price: parseInt(profileForm.price) || 200000,
          downloadSpeed: dlSpeed,
          uploadSpeed: ulSpeed,
          ipPoolName: profileForm.ipPoolName || null,
          localAddress: profileForm.localAddress || null,
          hpp: parseInt(profileForm.hpp) || 0,
          proratePricePerDay: parseInt(profileForm.proratePricePerDay) || 0,
          ppnActive: profileForm.ppnActive,
          validityValue: parseInt(profileForm.validityValue) || 1,
          validityUnit: profileForm.validityUnit || 'MONTHS',
          sharedUser: profileForm.sharedUser,
          description: profileForm.description || '',
          lastRouterId: savedRouterId || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal membuat paket PPPoE');
      }
      const data = await res.json();
      setCreatedProfile(data.profile || data);
      markStepCompleted(5);
      setCurrentStep(6);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan paket');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Step 6: Save Customer
  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);
    try {
      const res = await fetch('/api/pppoe/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone,
          username: customerForm.username,
          password: customerForm.password,
          profileName: createdProfile?.name || profileForm.name,
          routerId: savedRouterId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Gagal membuat akun pelanggan');
      const data = await res.json();
      setCreatedCustomer(data.user || data);
      markStepCompleted(6);
      setCurrentStep(7);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat pelanggan');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Step 7: WhatsApp provider handlers
  const fetchWaProvidersList = async () => {
    setWaLoading(true);
    try {
      const res = await fetch('/api/whatsapp/providers');
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data) ? data.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)) : [];
        setWaProviders(sorted);
        const active = sorted.some((p: any) => p.isActive);
        setWaConnected(active);
        if (active) markStepCompleted(7);
        fetchWaStatuses(sorted);
      }
    } catch (e) {
      console.error('Failed fetching WA providers:', e);
    } finally {
      setWaLoading(false);
    }
  };

  const fetchWaStatuses = async (list?: any[]) => {
    const targetList = list || waProviders;
    if (!targetList || targetList.length === 0) return;
    const newStatuses: Record<string, any> = {};
    await Promise.all(
      targetList.map(async (provider: any) => {
        if (['mpwa', 'waha', 'gowa', 'baileys'].includes(provider.type)) {
          try {
            const res = await fetch(`/api/whatsapp/providers/${provider.id}/status`);
            if (res.ok) {
              newStatuses[provider.id] = await res.json();
            }
          } catch (e) {
            console.error(`Error status for ${provider.name}:`, e);
          }
        }
      })
    );
    setWaStatusesMap(prev => ({ ...prev, ...newStatuses }));
  };

  const handleCheckWa = async () => {
    fetchWaProvidersList();
  };

  const handleToggleWaActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/whatsapp/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        fetchWaProvidersList();
      }
    } catch (e) {
      console.error('Error toggling WA provider:', e);
    }
  };

  const handleDeleteWaProvider = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus provider WhatsApp ini?')) return;
    try {
      const res = await fetch(`/api/whatsapp/providers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWaProvidersList();
      }
    } catch (e) {
      console.error('Error deleting WA provider:', e);
    }
  };

  const handleSaveWaProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waFormData.name || !waFormData.type || (waFormData.type !== 'baileys' && !waFormData.apiUrl)) {
      alert('Nama, Jenis Provider, dan API URL (untuk non-baileys) wajib diisi.');
      return;
    }
    try {
      const url = editingWaProvider ? `/api/whatsapp/providers/${editingWaProvider.id}` : '/api/whatsapp/providers';
      const method = editingWaProvider ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...waFormData,
          apiUrl: waFormData.type === 'baileys' ? (waFormData.apiUrl || 'internal') : waFormData.apiUrl,
          apiKey: waFormData.type === 'baileys' ? (waFormData.apiKey || 'internal') : waFormData.apiKey,
        }),
      });
      if (res.ok) {
        setShowWaModal(false);
        setEditingWaProvider(null);
        fetchWaProvidersList();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan WhatsApp provider');
      }
    } catch (e) {
      console.error('Error saving WA provider:', e);
    }
  };

  const handleRestartWaSession = async (provider: any) => {
    if (!confirm(`Sesi WhatsApp ${provider.name} akan di-restart. Lanjutkan?`)) return;
    setRestartingWaProvider(provider.id);
    try {
      const res = await fetch(`/api/whatsapp/providers/${provider.id}/restart`, { method: 'POST' });
      if (res.ok) {
        alert('Sesi WhatsApp berhasil di-restart.');
        fetchWaStatuses();
        setTimeout(() => handleShowWaQr(provider), 1000);
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal restart sesi WhatsApp');
      }
    } catch (e) {
      console.error('Error restarting WA session:', e);
    } finally {
      setRestartingWaProvider(null);
    }
  };

  const handleShowWaQr = async (provider: any) => {
    setWaQrProvider(provider);
    setShowWaQrModal(true);
    setWaQrLoading(true);
    setWaQrImage(null);
    setWaQrConnected(false);
    if (waQrPollingRef) clearInterval(waQrPollingRef);

    try {
      const res = await fetch(`/api/whatsapp/providers/${provider.id}/qr`);
      if (res.ok) {
        if (provider.type === 'mpwa' || provider.type === 'baileys') {
          const data = await res.json();
          if (data.status === 'qrcode' && data.qrcode) {
            setWaQrImage(data.qrcode);
            startWaQrPolling(provider);
          } else if (data.connected || data.status === 'connected') {
            setWaQrConnected(true);
          }
        } else {
          const blob = await res.blob();
          setWaQrImage(URL.createObjectURL(blob));
          startWaQrPolling(provider);
        }
      } else if (res.status === 202) {
        setTimeout(() => handleShowWaQr(provider), 2500);
      } else if (res.status === 422) {
        setWaQrConnected(true);
      }
    } catch (e) {
      console.error('Error fetching WA QR:', e);
    } finally {
      setWaQrLoading(false);
    }
  };

  const startWaQrPolling = (provider: any) => {
    if (waQrPollingRef) clearInterval(waQrPollingRef);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/providers/${provider.id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            clearInterval(interval);
            setWaQrConnected(true);
            setWaQrImage(null);
            fetchWaStatuses();
          }
        }
      } catch (e) {
        // ignore
      }
    }, 3000);
    setWaQrPollingRef(interval);
  };

  const handleCloseWaQrModal = () => {
    if (waQrPollingRef) clearInterval(waQrPollingRef);
    setWaQrPollingRef(null);
    setShowWaQrModal(false);
    setWaQrImage(null);
    setWaQrConnected(false);
    fetchWaStatuses();
  };

  // Step 8: Save RADIUS Mode
  const handleSaveRadius = async () => {
    setIsSavingRadius(true);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radiusEnabled: radiusForm.radiusEnabled,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyimpan mode RADIUS');
      }

      setRadiusEnabled(radiusForm.radiusEnabled);
      markStepCompleted(8);
      setCurrentStep(9);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan mode RADIUS');
    } finally {
      setIsSavingRadius(false);
    }
  };

  // Step 11: Save Technician Account
  const handleSaveTechnician = async () => {
    setIsSavingTech(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: techForm.name,
          username: techForm.username,
          password: techForm.password,
          phone: techForm.phone,
          role: 'TECHNICIAN',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal membuat akun teknisi');
      }

      setTechSaved(true);
      markStepCompleted(11);
      setCurrentStep(12);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat akun teknisi');
    } finally {
      setIsSavingTech(false);
    }
  };

  // Global Loading State
  if (checkingInit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memeriksa status konfigurasi EugineBill...</p>
      </div>
    );
  }

  // Calculate overall progress percentage
  const displaySteps = isInitialized ? ALL_STEPS.filter((s) => s.id > 0) : ALL_STEPS;
  const totalCount = displaySteps.length;
  const doneCount = completedSteps.length;
  const progressPercent = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50/80 text-foreground pb-16">
      {/* ── TOPBAR HEADER — Unifying Design with /admin ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
            EB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">EugineBill RADIUS</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                v2.40.74
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Dedicated Onboarding & Service Setup Wizard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessionStatus === 'authenticated' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
              className="text-xs gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span>Dashboard Admin</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => router.push('/admin/login?callbackUrl=/setup')}
              className="text-xs gap-2 bg-[#002C60] hover:bg-[#1b437c] text-white"
            >
              <UserCheck className="w-4 h-4" />
              <span>Login Admin</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT (2-COLUMN CONTAINER) ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Session Required Warning Banner if initialized but unauthenticated */}
        {isInitialized && sessionStatus !== 'authenticated' && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Login Admin Diperlukan:</span> Sistem sudah terinisialisasi (Progress Setup {progressPercent}%). Silakan login dengan akun superadmin untuk melanjutkan atau menyimpan konfigurasi.
              </div>
            </div>
            <Button onClick={() => router.push('/admin/login?callbackUrl=/setup')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Login Admin Sekarang</span>
            </Button>
          </div>
        )}

        {/* Soft Notification Banner if system has operational data */}
        {hasExistingData && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-950 flex items-start gap-3 shadow-xs">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <span className="font-bold">Sistem Operasional Aktif:</span> Ditemukan {existingStats.routerCount}{' '}
              Router & {existingStats.userCount} Pelanggan PPPoE aktif. Wizard ini tetap dapat digunakan untuk mengecek
              koneksi atau menambah konfigurasi baru.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN: STEP NAVIGATION SIDEBAR (4 cols) ── */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border shadow-xs bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Langkah Setup</CardTitle>
                  <span className="text-xs font-semibold text-primary">{progressPercent}% Selesai</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-1">
                {displaySteps.map((step) => {
                  const Icon = step.icon;
                  const isCurrent = currentStep === step.id;
                  const isDone = completedSteps.includes(step.id);

                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        // Allow step click if initialized or step 0
                        if (isInitialized || step.id === 0) {
                          setCurrentStep(step.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                          : isDone
                          ? 'hover:bg-muted text-foreground'
                          : 'opacity-60 hover:opacity-90 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{step.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{step.desc}</div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700">
                            Selesai
                          </Badge>
                        ) : isCurrent ? (
                          <Badge variant="default" className="text-[10px]">
                            Aktif
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs bg-muted/30 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <HelpCircle className="w-4 h-4 text-primary" /> Bantuan Setup Fast-Track
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Seluruh langkah di atas dirancang otomatis. Jika Anda ingin melewati wizard ini, Anda dapat langsung menuju ke Dashboard Admin.
              </p>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: ACTIVE STEP CONTENT CARD (8 cols) ── */}
          <div className="lg:col-span-8">
            {/* STEP 0: Inisialisasi Superadmin & ISP (System Uninitialized) */}
            {currentStep === 0 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Inisialisasi Akses Superadmin & Profile ISP</CardTitle>
                      <CardDescription>
                        Lengkapi akun login pertama Anda dan nama usaha ISP untuk membuka akses database.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {initError && (
                    <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{initError}</span>
                    </div>
                  )}

                  <form onSubmit={handleInitialSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        1. Profil Perusahaan ISP
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="initCompanyName">Nama ISP / Perusahaan *</Label>
                          <Input
                            id="initCompanyName"
                            required
                            value={initFormData.companyName}
                            onChange={(e) => setInitFormData({ ...initFormData, companyName: e.target.value })}
                            placeholder="Contoh: PT Solusi Cepat Net"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="initCompanyPhone">No. WhatsApp Admin / CS *</Label>
                          <Input
                            id="initCompanyPhone"
                            required
                            value={initFormData.companyPhone}
                            onChange={(e) => setInitFormData({ ...initFormData, companyPhone: e.target.value })}
                            placeholder="0812xxxxxxxx"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="initBaseUrl">Base URL / Domain Billing</Label>
                          <Input
                            id="initBaseUrl"
                            value={initFormData.baseUrl}
                            onChange={(e) => setInitFormData({ ...initFormData, baseUrl: e.target.value })}
                            placeholder="https://billing.isp.net"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="initCompanyAddress">Alamat Kantor</Label>
                          <Input
                            id="initCompanyAddress"
                            value={initFormData.companyAddress}
                            onChange={(e) => setInitFormData({ ...initFormData, companyAddress: e.target.value })}
                            placeholder="Jl. Telekomunikasi No. 88"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        2. Akun Login Superadmin
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="initAdminName">Nama Lengkap Superadmin *</Label>
                        <Input
                          id="initAdminName"
                          required
                          value={initFormData.adminName}
                          onChange={(e) => setInitFormData({ ...initFormData, adminName: e.target.value })}
                          placeholder="Nama Administrator"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="initAdminUsername">Username Login *</Label>
                          <Input
                            id="initAdminUsername"
                            required
                            value={initFormData.adminUsername}
                            onChange={(e) => setInitFormData({ ...initFormData, adminUsername: e.target.value })}
                            placeholder="admin"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="initAdminEmail">Email Admin *</Label>
                          <Input
                            id="initAdminEmail"
                            required
                            type="email"
                            value={initFormData.adminEmail}
                            onChange={(e) => setInitFormData({ ...initFormData, adminEmail: e.target.value })}
                            placeholder="admin@isp.net"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="initAdminPassword">Password *</Label>
                          <Input
                            id="initAdminPassword"
                            required
                            type="password"
                            value={initFormData.adminPassword}
                            onChange={(e) => setInitFormData({ ...initFormData, adminPassword: e.target.value })}
                            placeholder="Minimal 6 karakter"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="initAdminPasswordConfirm">Konfirmasi Password *</Label>
                          <Input
                            id="initAdminPasswordConfirm"
                            required
                            type="password"
                            value={initFormData.adminPasswordConfirm}
                            onChange={(e) => setInitFormData({ ...initFormData, adminPasswordConfirm: e.target.value })}
                            placeholder="Ulangi password"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" disabled={initSubmitting} variant="success" size="lg">
                        {initSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Simpan & Inisialisasi Sistem</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* STEP 1: PROFIL & KONTAK ISP */}
            {currentStep === 1 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Profil & Kontak Usaha ISP</CardTitle>
                        <CardDescription>
                          Identitas resmi perusahaan yang tercetak pada invoice dan kwitansi pembayaran pelanggan.
                        </CardDescription>
                      </div>
                    </div>
                    {companySaved && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Tersimpan
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="step1Name">Nama Perusahaan / Brand ISP *</Label>
                      <Input
                        id="step1Name"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        placeholder="Contoh: Eugine Solusi Net"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step1Phone">No. WhatsApp CS / Billing *</Label>
                      <Input
                        id="step1Phone"
                        value={companyForm.adminPhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, adminPhone: e.target.value, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="step1Email">Email Resmi Perusahaan</Label>
                      <Input
                        id="step1Email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        placeholder="support@isp.net"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step1Url">Base URL / Domain Billing</Label>
                      <Input
                        id="step1Url"
                        value={companyForm.baseUrl}
                        onChange={(e) => setCompanyForm({ ...companyForm, baseUrl: e.target.value })}
                        placeholder="https://billing.isp.net"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="step1Address">Alamat Lengkap Kantor</Label>
                    <Input
                      id="step1Address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Jl. Protokol Telekomunikasi No. 88, Jakarta"
                    />
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(0)} disabled={!isInitialized}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
                    {isSavingCompany ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Simpan & Lanjut Ke MikroTik</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 2: CLIENT VPN SETUP (WIREGUARD / L2TP / DIRECT IP) */}
            {currentStep === 2 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Cable className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Client VPN Setup (MikroTik Tunnel)</CardTitle>
                        <CardDescription>
                          Pilih protokol VPN (WireGuard / L2TP) atau Direct IP untuk menghubungkan VPS EugineBill dengan router MikroTik.
                        </CardDescription>
                      </div>
                    </div>
                    {vpnClientSaved && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Client VPN Siap
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Connection Method Toggle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server VPN & Protokol *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setConnectionMethod('wireguard'); setVpnClientSaved(false); }}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          connectionMethod === 'wireguard'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        [VPS Native] WireGuard Server
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConnectionMethod('l2tp'); setVpnClientSaved(false); }}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          connectionMethod === 'l2tp'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        L2TP / IPSec Client VPN
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionMethod('direct')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          connectionMethod === 'direct'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Direct IP API (Tanpa VPN)
                      </button>
                    </div>
                  </div>

                  {/* Contextual Guidance Callout */}
                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-foreground space-y-1.5 text-xs">
                    <div className="font-bold flex items-center gap-2 text-primary">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>
                        {connectionMethod === 'direct'
                          ? 'Petunjuk Koneksi Direct IP API:'
                          : `Petunjuk Alur Koneksi ${connectionMethod === 'wireguard' ? 'WireGuard' : 'L2TP'} VPN Tunnel:`}
                      </span>
                    </div>
                    {connectionMethod === 'direct' ? (
                      <p className="text-muted-foreground leading-relaxed">
                        Gunakan metode ini jika VPS Billing dan Router MikroTik Anda berada dalam 1 lokasi LAN yang sama (misal 192.168.88.1) atau Router Anda memiliki IP Publik Static yang dapat diakses langsung. Anda dapat langsung melanjutkan ke langkah konfigurasi router.
                      </p>
                    ) : (
                      <p className="text-muted-foreground leading-relaxed">
                        VPS EugineBill bertindak sebagai <strong className="text-foreground">VPN Server</strong>. Alokasi <strong className="text-foreground">IP Client Tunnel</strong> digunakan VPS untuk meremote MikroTik menembus NAT ISP. Tambahkan Client VPN terlebih dahulu, lalu <strong className="text-foreground">Salin Skrip</strong> yang di-generate dan <strong className="text-foreground">Paste di Terminal Winbox</strong> MikroTik Anda!
                      </p>
                    )}
                  </div>

                  {connectionMethod === 'direct' ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                      <Globe className="w-8 h-8 text-primary mx-auto" />
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">Mode Direct IP API Aktif</div>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Tidak diperlukan tunnel VPN. Klik tombol di bawah untuk langsung mengisi kredensial login API MikroTik Anda.
                        </p>
                      </div>
                      <Button onClick={() => { markStepCompleted(2); setCurrentStep(3); }} className="bg-[#002C60] hover:bg-[#1b437c] text-white text-xs gap-1.5">
                        <span>Lanjut ke Koneksi Router MikroTik</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary">
                        Form Tambah Client VPN ({connectionMethod === 'wireguard' ? 'WireGuard' : 'L2TP'})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vpnName">Nama Client *</Label>
                          <Input
                            id="vpnName"
                            value={routerForm.name}
                            onChange={(e) => setRouterForm({ ...routerForm, name: e.target.value })}
                            placeholder="cth: MIKROTIK SITE CIBINONG"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="allowedIps">IP Lokal / Subnet di Balik NAS (AllowedIPs)</Label>
                          <Input
                            id="allowedIps"
                            value={routerForm.allowedIps}
                            onChange={(e) => setRouterForm({ ...routerForm, allowedIps: e.target.value })}
                            placeholder="cth: 192.168.21.0/24, 192.168.1.0/24"
                          />
                          <p className="text-[11px] text-muted-foreground">Pisahkan dengan koma. Diperlukan untuk remote ONT di balik MikroTik.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="winboxPort">Target Winbox Port *</Label>
                          <Input
                            id="winboxPort"
                            type="number"
                            value={routerForm.winboxPort}
                            onChange={(e) => setRouterForm({ ...routerForm, winboxPort: e.target.value })}
                            placeholder="8291"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="routerPort">Target API Port *</Label>
                          <Input
                            id="routerPort"
                            type="number"
                            value={routerForm.port}
                            onChange={(e) => setRouterForm({ ...routerForm, port: e.target.value })}
                            placeholder="8728"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wwwPort">Target WWW Port *</Label>
                          <Input
                            id="wwwPort"
                            type="number"
                            value={routerForm.wwwPort}
                            onChange={(e) => setRouterForm({ ...routerForm, wwwPort: e.target.value })}
                            placeholder="80"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button onClick={handleSaveVpnClient} disabled={isSavingVpnClient} className="w-full bg-[#002C60] hover:bg-[#1b437c] text-white gap-2">
                          {isSavingVpnClient ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          <span>Simpan & Buat Client VPN</span>
                        </Button>
                      </div>

                      {vpnClientSaved && (
                        <div className="space-y-3 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-xs font-bold text-foreground">Skrip Generator RouterOS MikroTik Terminal</Label>
                              <p className="text-[11px] text-muted-foreground">Salin skrip di bawah dan tempel di terminal MikroTik Anda.</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                copyToClipboard(generatedScript);
                                setCopiedScript(true);
                                setTimeout(() => setCopiedScript(false), 2000);
                              }}
                              className="text-xs gap-1.5 h-8"
                            >
                              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedScript ? 'Tersalin!' : 'Salin Skrip'}</span>
                            </Button>
                          </div>
                          <textarea
                            readOnly
                            rows={8}
                            value={generatedScript}
                            className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/60 text-foreground focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Kembali
                  </Button>
                  <Button
                    onClick={() => {
                      markStepCompleted(2);
                      setCurrentStep(3);
                    }}
                    className="bg-[#002C60] hover:bg-[#1b437c] text-white"
                  >
                    <span>Lanjut ke Koneksi Router MikroTik</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 3: KONEKSI ROUTER MIKROTIK (API & CREDENTIALS) */}
            {currentStep === 3 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Koneksi Router MikroTik</CardTitle>
                        <CardDescription>
                          Konfigurasi kredensial API dan parameter koneksi MikroTik untuk billing & manajemen pelanggan.
                        </CardDescription>
                      </div>
                    </div>
                    {routerSaved && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Terhubung
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="routerName">Nama Router / Identitas *</Label>
                      <Input
                        id="routerName"
                        value={routerForm.name}
                        onChange={(e) => setRouterForm({ ...routerForm, name: e.target.value })}
                        placeholder="cth: MikroTik-Utama"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="routerIp">
                        {connectionMethod === 'direct' ? 'Alamat IP (LAN / Publik Static) *' : 'IP VPN Client Tunnel *'}
                      </Label>
                      <Input
                        id="routerIp"
                        value={routerForm.ipAddress}
                        onChange={(e) => setRouterForm({ ...routerForm, ipAddress: e.target.value })}
                        placeholder="cth: 10.254.1.2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="routerApiPort">Port API MikroTik *</Label>
                      <Input
                        id="routerApiPort"
                        type="number"
                        value={routerForm.port}
                        onChange={(e) => setRouterForm({ ...routerForm, port: e.target.value })}
                        placeholder="8728"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routerWinboxPort">Port Winbox</Label>
                      <Input
                        id="routerWinboxPort"
                        type="number"
                        value={routerForm.winboxPort}
                        onChange={(e) => setRouterForm({ ...routerForm, winboxPort: e.target.value })}
                        placeholder="8291"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routerWwwPort">Port WWW / WebFig</Label>
                      <Input
                        id="routerWwwPort"
                        type="number"
                        value={routerForm.wwwPort}
                        onChange={(e) => setRouterForm({ ...routerForm, wwwPort: e.target.value })}
                        placeholder="80"
                      />
                    </div>
                  </div>

                  {/* Credentials Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="routerUsername">Username API MikroTik *</Label>
                      <Input
                        id="routerUsername"
                        value={routerForm.username}
                        onChange={(e) => setRouterForm({ ...routerForm, username: e.target.value })}
                        placeholder="euginebill_api"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routerPassword">Password API MikroTik *</Label>
                      <Input
                        id="routerPassword"
                        type="password"
                        value={routerForm.password}
                        onChange={(e) => setRouterForm({ ...routerForm, password: e.target.value })}
                        placeholder="Password API"
                      />
                    </div>
                  </div>

                  {/* Auth Mode Section */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      Mode Autentikasi Pelanggan *
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          routerForm.authMode === 'local'
                            ? 'border-primary bg-primary/5 text-foreground font-medium'
                            : 'border-border bg-background text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="authMode"
                          value="local"
                          checked={routerForm.authMode === 'local'}
                          onChange={() => setRouterForm({ ...routerForm, authMode: 'local' })}
                          className="mt-1"
                        />
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-foreground">Local MikroTik API (Default - Langsung RouterOS)</div>
                          <p className="text-muted-foreground text-[11px]">
                            Autentikasi dikelola langsung pada database internal MikroTik (/ppp/secret & /ip/hotspot/user).
                          </p>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          routerForm.authMode === 'radius'
                            ? 'border-primary bg-primary/5 text-foreground font-medium'
                            : 'border-border bg-background text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="authMode"
                          value="radius"
                          checked={routerForm.authMode === 'radius'}
                          onChange={() => setRouterForm({ ...routerForm, authMode: 'radius' })}
                          className="mt-1"
                        />
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-foreground">FreeRADIUS Server Mode</div>
                          <p className="text-muted-foreground text-[11px]">
                            Autentikasi dikelola secara terpusat melalui server FreeRADIUS VPS EugineBill.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* FreeRADIUS Integration Card — STRICTLY HIDDEN UNLESS radiusEnabled && authMode === 'radius' */}
                  {radiusEnabled && routerForm.authMode === 'radius' && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 space-y-2 text-xs">
                      <div className="font-bold flex items-center gap-2">
                        <Radio className="w-4 h-4 text-amber-600" />
                        <span>FreeRADIUS Server Integration</span>
                      </div>
                      <p>
                        RADIUS Secret: <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">{routerForm.secret}</code>
                      </p>
                    </div>
                  )}

                  {/* Test Result Box */}
                  {testResult && (
                    <div
                      className={`p-4 rounded-lg border text-xs leading-relaxed ${
                        testResult.success
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }`}
                    >
                      <div className="font-bold mb-1">
                        {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                      </div>
                      <p>{testResult.message}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Kembali
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleTestRouter} disabled={isTestingRouter}>
                      {isTestingRouter ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 text-primary" />}
                      <span>Uji Koneksi API</span>
                    </Button>
                    <Button onClick={handleSaveRouter} disabled={isSavingRouter} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                      <span>Lanjut ke Sistem Isolir</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* STEP 4: SISTEM ISOLIR */}
            {currentStep === 4 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Pengaturan Sistem Isolasi Pelanggan</CardTitle>
                      <CardDescription>
                        Konfigurasi aturan pemblokiran otomatis, IP pool isolir, rate limit, dan whitelist payment gateway.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* General Isolation Settings Form */}
                  <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      1. Pengaturan Umum & Jaringan Isolir
                    </div>

                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                      <div>
                        <Label className="text-xs font-bold text-foreground">Aktifkan Auto Isolasi</Label>
                        <p className="text-[11px] text-muted-foreground">Isolir otomatis pelanggan yang kadaluwarsa setiap jam.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isolationForm.isolationEnabled}
                        onChange={(e) => setIsolationForm({ ...isolationForm, isolationEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="isoIpPool">IP Pool Isolir (CIDR) *</Label>
                        <Input
                          id="isoIpPool"
                          value={isolationForm.isolationIpPool}
                          onChange={(e) => setIsolationForm({ ...isolationForm, isolationIpPool: e.target.value })}
                          placeholder="192.168.200.0/24"
                        />
                        <p className="text-[11px] text-muted-foreground">Default: 192.168.200.0/24</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="isoServerIp">IP Server VPS NAT *</Label>
                        <Input
                          id="isoServerIp"
                          value={isolationForm.isolationServerIp}
                          onChange={(e) => setIsolationForm({ ...isolationForm, isolationServerIp: e.target.value })}
                          placeholder="43.173.14.236"
                        />
                        <p className="text-[11px] text-muted-foreground">IP VPS Billing untuk redirect NAT MikroTik.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="isoRateLimit">Rate Limit (Bandwidth) *</Label>
                        <Input
                          id="isoRateLimit"
                          value={isolationForm.isolationRateLimit}
                          onChange={(e) => setIsolationForm({ ...isolationForm, isolationRateLimit: e.target.value })}
                          placeholder="64k/64k"
                        />
                        <p className="text-[11px] text-muted-foreground">Upload/Download (cth: 64k/64k, 128k/128k)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                        <div>
                          <Label className="text-xs font-bold text-foreground">Izinkan Akses DNS</Label>
                          <p className="text-[11px] text-muted-foreground">Dibutuhkan untuk resolve domain payment gateway.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isolationForm.isolationAllowDns}
                          onChange={(e) => setIsolationForm({ ...isolationForm, isolationAllowDns: e.target.checked })}
                          className="w-4 h-4 rounded text-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                        <div>
                          <Label className="text-xs font-bold text-foreground">Izinkan Payment Gateway</Label>
                          <p className="text-[11px] text-muted-foreground">Pelanggan terisolir dapat melakukan bayar mandiri.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isolationForm.isolationAllowPayment}
                          onChange={(e) => setIsolationForm({ ...isolationForm, isolationAllowPayment: e.target.checked })}
                          className="w-4 h-4 rounded text-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Integrated RouterOS Script Generator Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                        2. Skrip Generator RouterOS MikroTik
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setIsolationRosVersion('ros7')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isolationRosVersion === 'ros7' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                            }`}
                          >
                            ROS v7
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsolationRosVersion('ros6')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isolationRosVersion === 'ros6' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                            }`}
                          >
                            ROS v6
                          </button>
                        </div>
                        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setIsolationAuthMode('local')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isolationAuthMode === 'local' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                            }`}
                          >
                            Local Auth
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsolationAuthMode('radius')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isolationAuthMode === 'radius' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                            }`}
                          >
                            RADIUS Mode
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          Skrip Otomatis Berdasarkan Pengaturan Anda (ROS Version: {isolationRosVersion.toUpperCase()})
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fullScript = `# ========================================================\n# EUGINEBILL ISOLIR SCRIPT (${isolationRosVersion.toUpperCase()} - ${isolationAuthMode.toUpperCase()})\n# Target VPS: ${isolationForm.isolationServerIp}\n# ========================================================\n\n/ip pool\nadd name=pool-isolir ranges=192.168.200.100-192.168.200.200 comment="EugineBill - IP Pool Isolir"\n\n/ppp profile\nadd name=isolir local-address=192.168.200.1 remote-address=pool-isolir address-list=isolir rate-limit=${isolationForm.isolationRateLimit} comment="EugineBill - Profile Isolir"\n\n/ip firewall address-list\nadd list=payment-gateways address=api.midtrans.com comment="Midtrans API"\nadd list=payment-gateways address=app.midtrans.com comment="Midtrans Snap"\nadd list=payment-gateways address=api.xendit.co comment="Xendit API"\nadd list=payment-gateways address=checkout.xendit.co comment="Xendit Checkout"\nadd list=payment-gateways address=passport.duitku.com comment="Duitku API"\nadd list=payment-gateways address=tripay.co.id comment="Tripay"\nadd list=payment-gateways address=qrin.web.id comment="QRIN Web Gateway"\nadd list=payment-gateways address=api.qrin.web.id comment="QRIN API Gateway"\nadd list=payment-gateways address=api.dana.id comment="DANA API"\nadd list=payment-gateways address=gopay.co.id comment="GoPay"\nadd list=payment-gateways address=qris.id comment="QRIS Hub"\n\n/ip firewall filter\nadd chain=forward src-address-list=isolir connection-state=established,related action=accept comment="Allow Established Isolir"\nadd chain=forward src-address-list=isolir protocol=udp dst-port=53 action=accept comment="Allow DNS Isolir"\nadd chain=forward src-address-list=isolir protocol=tcp dst-port=53 action=accept comment="Allow DNS TCP Isolir"\nadd chain=forward src-address-list=isolir dst-address=${isolationForm.isolationServerIp} action=accept comment="Allow Billing Server Access"\nadd chain=forward src-address-list=isolir dst-address-list=payment-gateways action=accept comment="Allow Payment Gateways"\nadd chain=forward src-address-list=isolir action=drop comment="Drop Other Internet Traffic Isolir"\n\n/ip firewall nat\nadd chain=dstnat src-address-list=isolir protocol=tcp dst-port=80 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=80 comment="Redirect HTTP to Billing Landing Page"\nadd chain=dstnat src-address-list=isolir protocol=tcp dst-port=443 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=443 comment="Redirect HTTPS to Billing Landing Page"\n`;
                            copyToClipboard(fullScript);
                            setCopiedIsolirScript(true);
                            setTimeout(() => setCopiedIsolirScript(false), 2000);
                          }}
                          className="text-xs gap-1.5 h-8"
                        >
                          {copiedIsolirScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedIsolirScript ? 'Tersalin!' : 'Salin Seluruh Script'}</span>
                        </Button>
                      </div>
                      <textarea
                        readOnly
                        rows={8}
                        value={`# ========================================================\n# EUGINEBILL ISOLIR SCRIPT (${isolationRosVersion.toUpperCase()} - ${isolationAuthMode.toUpperCase()})\n# Target VPS: ${isolationForm.isolationServerIp}\n# ========================================================\n\n/ip pool\nadd name=pool-isolir ranges=192.168.200.100-192.168.200.200 comment="EugineBill - IP Pool Isolir"\n\n/ppp profile\nadd name=isolir local-address=192.168.200.1 remote-address=pool-isolir address-list=isolir rate-limit=${isolationForm.isolationRateLimit} comment="EugineBill - Profile Isolir"\n\n/ip firewall address-list\nadd list=payment-gateways address=api.midtrans.com comment="Midtrans API"\nadd list=payment-gateways address=app.midtrans.com comment="Midtrans Snap"\nadd list=payment-gateways address=api.xendit.co comment="Xendit API"\nadd list=payment-gateways address=checkout.xendit.co comment="Xendit Checkout"\nadd list=payment-gateways address=passport.duitku.com comment="Duitku API"\nadd list=payment-gateways address=tripay.co.id comment="Tripay"\nadd list=payment-gateways address=qrin.web.id comment="QRIN Web Gateway"\nadd list=payment-gateways address=api.qrin.web.id comment="QRIN API Gateway"\nadd list=payment-gateways address=api.dana.id comment="DANA API"\nadd list=payment-gateways address=gopay.co.id comment="GoPay"\nadd list=payment-gateways address=qris.id comment="QRIS Hub"\n\n/ip firewall filter\nadd chain=forward src-address-list=isolir connection-state=established,related action=accept comment="Allow Established Isolir"\nadd chain=forward src-address-list=isolir protocol=udp dst-port=53 action=accept comment="Allow DNS Isolir"\nadd chain=forward src-address-list=isolir protocol=tcp dst-port=53 action=accept comment="Allow DNS TCP Isolir"\nadd chain=forward src-address-list=isolir dst-address=${isolationForm.isolationServerIp} action=accept comment="Allow Billing Server Access"\nadd chain=forward src-address-list=isolir dst-address-list=payment-gateways action=accept comment="Allow Payment Gateways"\nadd chain=forward src-address-list=isolir action=drop comment="Drop Other Internet Traffic Isolir"\n\n/ip firewall nat\nadd chain=dstnat src-address-list=isolir protocol=tcp dst-port=80 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=80 comment="Redirect HTTP to Billing Landing Page"\nadd chain=dstnat src-address-list=isolir protocol=tcp dst-port=443 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=443 comment="Redirect HTTPS to Billing Landing Page"\n`}
                        className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveIsolationSettings} disabled={isSavingIsolation} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    {isSavingIsolation ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Simpan & Lanjut ke Paket PPPoE</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 5: KONFIGURASI PAKET PPPOE */}
            {currentStep === 5 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Tambah Paket PPPoE</CardTitle>
                        <CardDescription>
                          Buat paket internet baru untuk pelanggan PPPoE dengan pengaturan kecepatan, IP pool, dan skema tarif.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opsi Buat Paket</Label>
                    <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, creationMode: 'new' })}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          profileForm.creationMode === 'new'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Buat Profil Baru
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, creationMode: 'existing' })}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          profileForm.creationMode === 'existing'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Pilih Profil MikroTik yang Ada
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-foreground text-xs leading-relaxed">
                    <strong className="text-primary font-bold">Catatan Sinkronisasi MikroTik:</strong> Pengaturan dasar (nama, kecepatan, dan IP pool) disinkronkan ke MikroTik. Pengaturan lanjutan seperti antrean CAKE / FQ-CoDel, Parent Queue, dan mangle dapat dikonfigurasi langsung di Winbox MikroTik tanpa terhapus saat sinkronisasi.
                  </div>

                  {/* Section 1: Basic & Bandwidth */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      1. Nama & Kecepatan Bandwidth
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profName">Nama Paket *</Label>
                        <Input
                          id="profName"
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, name: e.target.value, groupName: e.target.value })
                          }
                          placeholder="cth: Paket 10 Mbps"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profGroup">Nama Group (PPP Profile MikroTik) *</Label>
                        <Input
                          id="profGroup"
                          value={profileForm.groupName}
                          onChange={(e) => setProfileForm({ ...profileForm, groupName: e.target.value })}
                          placeholder="Default mengikuti nama paket"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Otomatis dipakai sebagai nama PPP Profile di MikroTik.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="speedUnit">Satuan Kecepatan *</Label>
                        <select
                          id="speedUnit"
                          value={profileForm.speedUnit}
                          onChange={(e) => setProfileForm({ ...profileForm, speedUnit: e.target.value as any })}
                          className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                        >
                          <option value="Mbps">Mbps (Megabit per detik)</option>
                          <option value="Kbps">Kbps (Kilobit per detik)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profDownload">Download ({profileForm.speedUnit}) *</Label>
                        <Input
                          id="profDownload"
                          type="number"
                          value={profileForm.downloadSpeed}
                          onChange={(e) => setProfileForm({ ...profileForm, downloadSpeed: e.target.value })}
                          placeholder="20"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          = {parseInt(profileForm.downloadSpeed || '0') * (profileForm.speedUnit === 'Mbps' ? 1024 : 1)} Kbps
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profUpload">Upload ({profileForm.speedUnit}) *</Label>
                        <Input
                          id="profUpload"
                          type="number"
                          value={profileForm.uploadSpeed}
                          onChange={(e) => setProfileForm({ ...profileForm, uploadSpeed: e.target.value })}
                          placeholder="20"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          = {parseInt(profileForm.uploadSpeed || '0') * (profileForm.speedUnit === 'Mbps' ? 1024 : 1)} Kbps
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: IP Address Allocation */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      2. Pengaturan Alokasi IP MikroTik
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ipPool">Remote Address (IP Pool MikroTik)</Label>
                        {routerResources.pools.length > 0 ? (
                          <select
                            id="ipPool"
                            value={profileForm.ipPoolName}
                            onChange={(e) => setProfileForm({ ...profileForm, ipPoolName: e.target.value })}
                            className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                          >
                            <option value="">Pilih IP Pool dari MikroTik...</option>
                            {routerResources.pools.map((pool) => (
                              <option key={pool.name} value={pool.name}>
                                {pool.name} ({pool.ranges})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id="ipPool"
                            value={profileForm.ipPoolName}
                            onChange={(e) => setProfileForm({ ...profileForm, ipPoolName: e.target.value })}
                            placeholder="cth: dhcp_pool1 atau pool-pppoe"
                          />
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Pool alamat IP MikroTik untuk alokasi IP dinamis pelanggan saat login.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="localAddress">Local Address (IP Gateway)</Label>
                        <Input
                          id="localAddress"
                          value={profileForm.localAddress}
                          onChange={(e) => setProfileForm({ ...profileForm, localAddress: e.target.value })}
                          placeholder="cth: 10.10.10.1 (opsional)"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          IP address interface router yang menjadi gateway PPP pelanggan.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Pricing & Billing */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      3. Tarif, Harga Modal & Masa Aktif
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profHpp">Harga Modal / HPP (IDR)</Label>
                        <Input
                          id="profHpp"
                          type="number"
                          value={profileForm.hpp}
                          onChange={(e) => setProfileForm({ ...profileForm, hpp: e.target.value })}
                          placeholder="100000"
                        />
                        <p className="text-[11px] text-muted-foreground">Biaya pokok / harga beli dari provider upstream.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profPrice">Harga Jual Bulanan (IDR) *</Label>
                        <Input
                          id="profPrice"
                          type="number"
                          value={profileForm.price}
                          onChange={(e) => setProfileForm({ ...profileForm, price: e.target.value })}
                          placeholder="200000"
                        />
                        <p className="text-[11px] text-muted-foreground">Tarif tagihan bulanan pelanggan.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profProrate">Harga Prorate per Hari (IDR)</Label>
                        <Input
                          id="profProrate"
                          type="number"
                          value={profileForm.proratePricePerDay}
                          onChange={(e) => setProfileForm({ ...profileForm, proratePricePerDay: e.target.value })}
                          placeholder="6666"
                        />
                        <p className="text-[11px] text-muted-foreground">Kelipatan 1000 (contoh: 5000 = Rp 5.000/hari)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="validityValue">Masa Aktif *</Label>
                        <Input
                          id="validityValue"
                          type="number"
                          value={profileForm.validityValue}
                          onChange={(e) => setProfileForm({ ...profileForm, validityValue: e.target.value })}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validityUnit">Satuan Masa Aktif *</Label>
                        <select
                          id="validityUnit"
                          value={profileForm.validityUnit}
                          onChange={(e) => setProfileForm({ ...profileForm, validityUnit: e.target.value as any })}
                          className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                        >
                          <option value="MONTHS">Bulan</option>
                          <option value="DAYS">Hari</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="ppnActive"
                          checked={profileForm.ppnActive}
                          onChange={(e) => setProfileForm({ ...profileForm, ppnActive: e.target.checked })}
                          className="rounded border-border"
                        />
                        <Label htmlFor="ppnActive" className="text-xs font-normal cursor-pointer">
                          PPN aktif (Pajak Pertambahan Nilai 11%)
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Extra Options */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      4. Pengaturan Tambahan Paket
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="profDesc">Deskripsi Paket</Label>
                      <Input
                        id="profDesc"
                        value={profileForm.description}
                        onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                        placeholder="cth: Paket Internet Rumah Uncapped Unlimited"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sharedUser"
                        checked={profileForm.sharedUser}
                        onChange={(e) => setProfileForm({ ...profileForm, sharedUser: e.target.checked })}
                        className="rounded border-border"
                      />
                      <Label htmlFor="sharedUser" className="text-xs font-normal cursor-pointer">
                        Shared User (boleh multi-device per akun; jika dimatikan MikroTik enforce 1 device)
                      </Label>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    {isSavingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Simpan Paket & Lanjut Ke Pelanggan</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 6: PELANGGAN TRIAL */}
            {currentStep === 6 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Akun Pelanggan Trial</CardTitle>
                      <CardDescription>
                        Buat satu akun pelanggan percobaan untuk memverifikasi autentikasi dial PPPoE dari router.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="custName">Nama Pelanggan *</Label>
                      <Input
                        id="custName"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        placeholder="Pelanggan Percobaan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custPhone">No. WhatsApp Pelanggan *</Label>
                      <Input
                        id="custPhone"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="custUser">Username PPPoE *</Label>
                      <Input
                        id="custUser"
                        value={customerForm.username}
                        onChange={(e) => setCustomerForm({ ...customerForm, username: e.target.value })}
                        placeholder="trial01"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custPass">Password / Secret PPPoE *</Label>
                      <Input
                        id="custPass"
                        type="password"
                        value={customerForm.password}
                        onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                        placeholder="secret@user123"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(5)}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveCustomer} disabled={isSavingCustomer} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    {isSavingCustomer ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Buat Akun & Lanjut ke Payment Gateway</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 7: REKENING BANK & PAYMENT GATEWAY */}
            {currentStep === 7 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Rekening Bank & Payment Gateway</CardTitle>
                        <CardDescription>
                          Integrasi pembayaran otomatis via Midtrans, Tripay, Xendit, QRIN, Duitku, iPaymu, atau Transfer Bank Manual.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Section 1: Transfer Bank Manual */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      1. Rekening Bank Transfer (Kwitansi & Invoice Pelanggan)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Nama Bank *</Label>
                        <select
                          id="bankName"
                          value={paymentForm.bankName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                          className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                        >
                          <option value="BCA">Bank BCA</option>
                          <option value="Mandiri">Bank Mandiri</option>
                          <option value="BRI">Bank BRI</option>
                          <option value="BNI">Bank BNI</option>
                          <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                          <option value="CIMB">Bank CIMB Niaga</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Nomor Rekening Bank *</Label>
                        <Input
                          id="accountNumber"
                          value={paymentForm.accountNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                          placeholder="cth: 1234567890"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Nama Pemilik Rekening *</Label>
                        <Input
                          id="accountName"
                          value={paymentForm.accountName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                          placeholder="cth: PT Eugine Solusi Internet"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Automated Payment Gateway Provider */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      2. Payment Gateway Otomatis (Opsional)
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted p-1 rounded-xl">
                      {(['manual', 'midtrans', 'tripay', 'xendit', 'duitku', 'qrin', 'ipaymu'] as const).map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, gatewayProvider: provider })}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                            paymentForm.gatewayProvider === provider
                              ? 'bg-background text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {provider === 'manual' ? 'Transfer Bank' : provider === 'qrin' ? 'QRIN (qrin.web.id)' : provider}
                        </button>
                      ))}
                    </div>

                    {/* QRIN Mode: Exactly 1 Field Only */}
                    {paymentForm.gatewayProvider === 'qrin' && (
                      <div className="space-y-2 pt-2 border border-primary/20 bg-primary/5 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                          <QrCode className="w-4 h-4" />
                          <span>Integrasi QRIN (QRIS Dinamis & Otomatis)</span>
                        </div>
                        <Label htmlFor="tokenQrin">Token QRIN *</Label>
                        <Input
                          id="tokenQrin"
                          type="password"
                          value={paymentForm.apiKey}
                          onChange={(e) => setPaymentForm({ ...paymentForm, apiKey: e.target.value })}
                          placeholder="Masukkan Token QRIN dari dashboard qrin.web.id"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Dapatkan token integrasi langsung dari dashboard merchant QRIN Anda (qrin.web.id). Tidak memerlukan Merchant Code tambahan.
                        </p>
                      </div>
                    )}

                    {/* Other Automated Gateways */}
                    {paymentForm.gatewayProvider !== 'manual' && paymentForm.gatewayProvider !== 'qrin' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="merchantCode">Merchant ID / Code</Label>
                          <Input
                            id="merchantCode"
                            value={paymentForm.merchantCode}
                            onChange={(e) => setPaymentForm({ ...paymentForm, merchantCode: e.target.value })}
                            placeholder="Kode merchant gateway"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key / Secret Key</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={paymentForm.apiKey}
                            onChange={(e) => setPaymentForm({ ...paymentForm, apiKey: e.target.value })}
                            placeholder="API Key gateway"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="webhookSecret">Webhook Secret (opsional)</Label>
                          <Input
                            id="webhookSecret"
                            type="password"
                            value={paymentForm.webhookSecret}
                            onChange={(e) => setPaymentForm({ ...paymentForm, webhookSecret: e.target.value })}
                            placeholder="Secret signature callback"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(6)}>
                    Kembali
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => {
                      if (typeof window !== 'undefined') localStorage.setItem('euginebill_wizard_completed', 'true');
                      markStepCompleted(7);
                      router.push('/admin');
                    }}>
                      <span>Ke Dashboard Admin</span>
                    </Button>
                    <Button onClick={() => { markStepCompleted(7); setCurrentStep(8); }} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                      <span>Lanjut ke Bot WhatsApp</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* STEP 8: BOT WHATSAPP */}
            {currentStep === 8 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Notifikasi WhatsApp Bot</CardTitle>
                        <CardDescription>
                          Kirim otomatis tagihan bulanan, kwitansi pembayaran, dan notifikasi isolir via WhatsApp Gateway.
                        </CardDescription>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => {
                      setEditingWaProvider(null);
                      setWaFormData({
                        name: 'Bot Utama Baileys',
                        type: 'baileys',
                        apiUrl: 'internal',
                        apiKey: 'internal',
                        senderNumber: '',
                        priority: 1,
                        description: 'WhatsApp Gateway Baileys Multi-Device',
                      });
                      setShowWaModal(true);
                    }} className="text-xs gap-1.5 bg-[#002C60] hover:bg-[#1b437c] text-white">
                      <Plus className="w-4 h-4" />
                      <span>Tambah Provider WA</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span>Status Bot WhatsApp Server</span>
                      </div>
                      <Badge variant={waConnected ? 'default' : 'outline'} className="gap-1">
                        <span className={`w-2 h-2 rounded-full ${waConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {waConnected ? 'Terhubung (Ready)' : 'Belum Terhubung'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Layanan WhatsApp Baileys berjalan di PM2 (<code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">EugineBill-wa</code>). Anda dapat menghubungkan QR Code nomor WhatsApp CS atau menambahkan provider cloud (Fonnte, Wablas, MPWA, WAHA, Gowa, Kirimi.id).
                    </p>
                  </div>

                  {/* Provider List Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Daftar Provider WhatsApp ({waProviders.length})</Label>
                      <Button variant="ghost" size="sm" onClick={fetchWaProvidersList} disabled={waLoading} className="text-xs gap-1.5 h-7 text-muted-foreground">
                        <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh Status</span>
                      </Button>
                    </div>

                    {waProviders.length === 0 ? (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                        <Smartphone className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground">Belum ada WhatsApp Provider. Klik tombol di atas untuk menambah gateway.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {waProviders.map((provider: any) => {
                          const status = waStatusesMap[provider.id];
                          const isConnected = status?.connected || status?.status === 'connected';

                          return (
                            <div key={provider.id} className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs hover:border-primary/40 transition-all">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">{provider.name}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono bg-primary/5 text-primary border-primary/20">
                                      {provider.type}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {provider.senderNumber ? `No: ${provider.senderNumber}` : provider.apiUrl}
                                  </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={provider.isActive}
                                    onChange={() => handleToggleWaActive(provider.id, provider.isActive)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : provider.isActive ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                  <span className="text-muted-foreground font-medium text-[11px]">
                                    {isConnected ? 'Connected' : provider.isActive ? (status?.status || 'Offline') : 'Nonaktif'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {['baileys', 'mpwa', 'waha', 'gowa'].includes(provider.type) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleShowWaQr(provider)}
                                        className="h-7 px-2 text-[11px] gap-1"
                                      >
                                        <QrCode className="w-3 h-3 text-primary" />
                                        <span>Scan QR</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRestartWaSession(provider)}
                                        disabled={restartingWaProvider === provider.id}
                                        className="h-7 px-2 text-[11px] gap-1 text-amber-600 hover:text-amber-700"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${restartingWaProvider === provider.id ? 'animate-spin' : ''}`} />
                                        <span>Restart</span>
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingWaProvider(provider);
                                      setWaFormData({
                                        name: provider.name,
                                        type: provider.type,
                                        apiUrl: provider.apiUrl || '',
                                        apiKey: provider.apiKey || '',
                                        senderNumber: provider.senderNumber || '',
                                        priority: provider.priority || 1,
                                        description: provider.description || '',
                                      });
                                      setShowWaModal(true);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteWaProvider(provider.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(7)}>
                    Kembali
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleCheckWa} disabled={waLoading}>
                      {waLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 text-primary" />}
                      <span>Cek Status WA</span>
                    </Button>
                    <Button onClick={() => { markStepCompleted(8); setCurrentStep(radiusEnabled ? 9 : 10); }} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                      <span>{radiusEnabled ? 'Lanjut ke RADIUS Server' : 'Lanjut ke TR-069 & GenieACS'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* STEP 9: RADIUS SERVER */}
            {currentStep === 9 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>FreeRADIUS Server Integration</CardTitle>
                      <CardDescription>
                        Aktifkan mode autentikasi RADIUS terpusat untuk akuntansi durasi, kuota, dan session AAA.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground">Mode Autentikasi RADIUS</div>
                        <p className="text-xs text-muted-foreground">Default: Direct API Mode (non-RADIUS). Aktifkan jika menggunakan FreeRADIUS.</p>
                      </div>
                      <input
                        type="checkbox"
                        id="radiusModeToggle"
                        checked={radiusForm.radiusEnabled}
                        onChange={(e) => setRadiusForm({ ...radiusForm, radiusEnabled: e.target.checked })}
                        className="w-5 h-5 accent-primary rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="radiusSecret">RADIUS Secret (NAS Secret) *</Label>
                      <Input
                        id="radiusSecret"
                        value={radiusForm.radiusSecret}
                        onChange={(e) => setRadiusForm({ ...radiusForm, radiusSecret: e.target.value })}
                        placeholder="secret123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nasIp">NAS IP Address MikroTik *</Label>
                      <Input
                        id="nasIp"
                        value={radiusForm.nasIp}
                        onChange={(e) => setRadiusForm({ ...radiusForm, nasIp: e.target.value })}
                        placeholder="10.254.1.2"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(8)}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveRadius} disabled={isSavingRadius} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    {isSavingRadius ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Simpan & Lanjut ke TR-069</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 10: TR-069 & GENIEACS */}
            {currentStep === 10 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>TR-069 & GenieACS ONT Management</CardTitle>
                      <CardDescription>
                        Manajemen remote ONT modem (SSID WiFi, Password, Reboot, Signal Optics) via standar CWMP / TR-069.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                      CWMP Endpoint & VLAN Management
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Endpoint TR-069 aktif secara otomatis di <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">/api/cwmp</code>. Pasang VLAN 4000 di MikroTik untuk mengalokasikan IP Management ONT.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Skrip Setup VLAN 4000 RouterOS Terminal</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const script = `/interface vlan add comment="VLAN4000-TR069-ACS" interface=bridge-LAN name=vlan4000-tr069 vlan-id=4000\n/ip address add address=10.40.10.1/24 comment="IP-GATEWAY-TR069-ACS" interface=vlan4000-tr069 network=10.40.10.0\n/ip pool add comment="POOL-DHCP-TR069" name=dhcp_pool_tr069 ranges=10.40.10.2-10.40.11.254\n/ip dhcp-server add address-pool=dhcp_pool_tr069 comment="DHCP-SERVER-TR069" disabled=no interface=vlan4000-tr069 name=dhcp-tr069\n/ip dhcp-server network add address=10.40.10.0/24 comment="NET-TR069-ACS" dns-server=1.1.1.1,8.8.8.8 gateway=10.40.10.1`;
                          copyToClipboard(script);
                          setCopiedAcsScript(true);
                          setTimeout(() => setCopiedAcsScript(false), 2000);
                        }}
                        className="text-xs gap-1.5 h-8"
                      >
                        {copiedAcsScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAcsScript ? 'Tersalin!' : 'Salin Skrip ACS'}</span>
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={`/interface vlan add comment="VLAN4000-TR069-ACS" interface=bridge-LAN name=vlan4000-tr069 vlan-id=4000\n/ip address add address=10.40.10.1/24 comment="IP-GATEWAY-TR069-ACS" interface=vlan4000-tr069 network=10.40.10.0\n/ip pool add comment="POOL-DHCP-TR069" name=dhcp_pool_tr069 ranges=10.40.10.2-10.40.11.254\n/ip dhcp-server add address-pool=dhcp_pool_tr069 comment="DHCP-SERVER-TR069" disabled=no interface=vlan4000-tr069 name=dhcp-tr069\n/ip dhcp-server network add address=10.40.10.0/24 comment="NET-TR069-ACS" dns-server=1.1.1.1,8.8.8.8 gateway=10.40.10.1`}
                      className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none"
                    />
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(radiusEnabled ? 9 : 8)}>
                    Kembali
                  </Button>
                  <Button onClick={() => { markStepCompleted(10); setCurrentStep(11); }} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    <span>Lanjut ke Tim & SPK</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 11: TIM & SPK TEKNISI */}
            {currentStep === 11 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Tim & SPK Teknisi</CardTitle>
                      <CardDescription>
                        Buat akun login portal teknisi untuk menerima tiket gangguan dan SPK pemasangan baru.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="techName">Nama Lengkap Teknisi *</Label>
                      <Input
                        id="techName"
                        value={techForm.name}
                        onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                        placeholder="Teknisi Lapangan 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="techPhone">No. WhatsApp Teknisi *</Label>
                      <Input
                        id="techPhone"
                        value={techForm.phone}
                        onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="techUsername">Username Login Portal Teknisi *</Label>
                      <Input
                        id="techUsername"
                        value={techForm.username}
                        onChange={(e) => setTechForm({ ...techForm, username: e.target.value })}
                        placeholder="teknisi01"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="techPassword">Password *</Label>
                      <Input
                        id="techPassword"
                        type="password"
                        value={techForm.password}
                        onChange={(e) => setTechForm({ ...techForm, password: e.target.value })}
                        placeholder="tech@password123"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(10)}>
                    Kembali
                  </Button>
                  <Button onClick={handleSaveTechnician} disabled={isSavingTech} className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                    {isSavingTech ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Buat Akun & Lanjut ke Peluncuran</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 12: PELUNCURAN SISTEM */}
            {currentStep === 12 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-emerald-700 dark:text-emerald-400">
                          Sistem Billing EugineBill Siap Diluncurkan!
                        </CardTitle>
                        <CardDescription>
                          Semua 12 modul utama infrastruktur jaringan dan operasional ISP telah terkonfigurasi 100%.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 space-y-3 text-xs">
                    <div className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Audit Kesiapan Turnkey System (100% Ready):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-800 dark:text-emerald-300 leading-relaxed pl-1">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Akun Superadmin & Database Billing</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Identitas ISP & Footer Login Direct</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Client VPN Tunnel WireGuard / L2TP</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> MikroTik API & Remote ONT NAT Proxy</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Auto-Isolir Firewall & Web Proxy 8080</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Paket Internet PPPoE & Kecepatan</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Pelanggan Percobaan PPPoE</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Rekening Bank & Payment Gateway (QRIN)</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Bot WhatsApp Baileys PM2 Service</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> FreeRADIUS Integration Ready</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> TR-069 GenieACS VLAN 4000</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Akun Teknisi & Manajemen SPK</div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(11)}>
                    Kembali
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('euginebill_wizard_completed', 'true');
                      }
                      markStepCompleted(12);
                      router.push('/admin');
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Selesaikan Setup & Masuk Ke Dashboard Admin</span>
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>

      {/* ── MODAL 1: ADD / EDIT WHATSAPP PROVIDER ── */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  {editingWaProvider ? 'Edit Provider WhatsApp' : 'Tambah Provider WhatsApp'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWaModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWaProvider} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Provider / Device *</Label>
                <Input
                  value={waFormData.name}
                  onChange={(e) => setWaFormData({ ...waFormData, name: e.target.value })}
                  placeholder="Bot Utama Baileys"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jenis Provider *</Label>
                <select
                  value={waFormData.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const defaultUrl = newType === 'baileys' ? 'internal' : newType === 'fonnte' ? 'https://api.fonnte.com/send' : newType === 'wablas' ? 'https://wa.wablas.com' : newType === 'kirimi' ? 'https://api.kirimi.id' : '';
                    setWaFormData({
                      ...waFormData,
                      type: newType,
                      apiUrl: defaultUrl || waFormData.apiUrl,
                      apiKey: newType === 'baileys' ? 'internal' : waFormData.apiKey,
                    });
                  }}
                  className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground focus:outline-none"
                >
                  <option value="baileys">Baileys (Built-in Local Node.js Service)</option>
                  <option value="fonnte">Fonnte (Cloud Gateway API)</option>
                  <option value="wablas">Wablas (Cloud Gateway API)</option>
                  <option value="mpwa">MPWA (Multi-Device Gateway)</option>
                  <option value="waha">WAHA (WhatsApp HTTP API)</option>
                  <option value="gowa">Gowa (Golang WhatsApp Gateway)</option>
                  <option value="kirimi">Kirimi.id (Cloud Gateway API)</option>
                </select>
              </div>

              {waFormData.type !== 'baileys' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">API Base URL *</Label>
                  <Input
                    value={waFormData.apiUrl}
                    onChange={(e) => setWaFormData({ ...waFormData, apiUrl: e.target.value })}
                    placeholder="https://api.fonnte.com/send"
                    required
                  />
                </div>
              )}

              {waFormData.type !== 'baileys' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">API Key / Token</Label>
                  <Input
                    type="password"
                    value={waFormData.apiKey}
                    onChange={(e) => setWaFormData({ ...waFormData, apiKey: e.target.value })}
                    placeholder="Token API dari provider"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nomor Pengirim / Device ID</Label>
                <Input
                  value={waFormData.senderNumber}
                  onChange={(e) => setWaFormData({ ...waFormData, senderNumber: e.target.value })}
                  placeholder="081234567890 atau Device ID"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prioritas Pengiriman (Angka)</Label>
                <Input
                  type="number"
                  value={waFormData.priority}
                  onChange={(e) => setWaFormData({ ...waFormData, priority: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowWaModal(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-[#002C60] hover:bg-[#1b437c] text-white">
                  Simpan Provider
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: QR CODE SCANNER ── */}
      {showWaQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-center">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Scan QR Code WhatsApp</h3>
              <button type="button" onClick={handleCloseWaQrModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {waQrConnected ? (
              <div className="py-6 space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-base text-emerald-600">WhatsApp Terhubung!</h4>
                <p className="text-xs text-muted-foreground">
                  Nomor WhatsApp CS berhasil tersambung ke server EugineBill. Notifikasi tagihan dan kwitansi siap dikirim otomatis.
                </p>
                <Button onClick={handleCloseWaQrModal} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Tutup & Lanjutkan
                </Button>
              </div>
            ) : waQrLoading ? (
              <div className="py-8 space-y-3">
                <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Menyiapkan QR Code dari Baileys Service...</p>
              </div>
            ) : waQrImage ? (
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-border inline-block shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={waQrImage} alt="QR Code WhatsApp" className="w-56 h-56 mx-auto object-contain" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Buka WhatsApp di HP Anda &gt; Menu Perangkat Tertaut &gt; Scan QR Code di atas.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-amber-600 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menunggu scan (auto-checking)...</span>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-xs text-muted-foreground">Gagal memuat QR Code. Pastikan service PM2 <code className="font-mono">EugineBill-wa</code> aktif.</p>
                <Button onClick={() => waQrProvider && handleShowWaQr(waQrProvider)} variant="outline" size="sm">
                  Coba Lagi
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
