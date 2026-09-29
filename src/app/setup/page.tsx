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
  Key,
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
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { copyToClipboard } from '@/lib/clipboard';
import { showSuccess, showError, showConfirm } from '@/lib/sweetalert';

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
  identity?: string;
  usedTls?: boolean;
}

interface VpnClient {
  id: string;
  name: string;
  vpnServerId: string;
  vpnIp: string;
  username: string;
  password: string;
  vpnType: string;
  description?: string;
  winboxPort?: number;
  publicPorts?: {
    blockStart: number;
    services: Record<string, { public: number; target: number }>;
  };
  apiUsername?: string;
  apiPassword?: string;
  clientPublicKey?: string | null;
  clientPrivateKey?: string | null;
  isActive: boolean;
  isRadiusServer: boolean;
  createdAt: string;
  vpnServer?: VpnServer;
  nasSecret?: string | null;
  resolvedUsername?: string | null;
  resolvedPassword?: string | null;
}

interface VpnServer {
  id: string;
  host: string;
  name: string;
  subnet: string;
  l2tpEnabled?: boolean;
  sstpEnabled?: boolean;
  pptpEnabled?: boolean;
  wgPublicKey?: string | null;
  wgPort?: number | null;
  wgEnabled?: boolean;
}

interface Credentials {
  server: string;
  username: string;
  password: string;
  vpnIp: string;
  winboxPort?: number;
  winboxRemote?: string;
  apiUsername?: string;
  apiPassword?: string;
  vpnType?: string;
  nasSecret?: string;
  radiusServerIp?: string;
  ipsecPsk?: string;
  clientPrivateKey?: string | null;
  serverPublicKey?: string | null;
  wgPort?: number | null;
  serverHost?: string;
  wgSubnet?: string;
  wgGatewayIp?: string;
  nasName?: string;
  publicPorts?: any;
  vpsPublicIp?: string;
}

interface Router {
  id: string;
  name: string;
  nasname: string;
  shortname: string;
  type: string;
  ipAddress: string;
  username: string;
  password: string;
  port: number;
  apiPort: number;
  secret: string;
  ports: number;
  server?: string;
  community?: string;
  description?: string;
  vpnClientId?: string;
  vpnClient?: {
    id: string;
    name: string;
    vpnIp: string;
    publicPorts?: {
      blockStart: number;
      services: Record<string, { public: number; target: number }>;
    };
  };
  authMode?: string;
  isActive: boolean;
  createdAt: string;
}

interface RouterStatus {
  online: boolean;
  identity?: string;
  uptime?: string;
}

function toSafeIfaceName(prefix: string, name: string): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 12);
  return `${prefix}-${safe || 'vpn'}`;
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

  // ── Step 2: VPN Client Management State ──────────────────────────────
  const [vpnClientsList, setVpnClientsList] = useState<VpnClient[]>([]);
  const [vpnServersList, setVpnServersList] = useState<VpnServer[]>([]);
  const [vpnLoading, setVpnLoading] = useState(false);
  const [showAddVpnModal, setShowAddVpnModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [selectedVpnType, setSelectedVpnType] = useState<'l2tp' | 'pptp' | 'sstp' | 'wireguard'>('wireguard');
  const [creatingVpnClient, setCreatingVpnClient] = useState(false);
  const [editingIpClientId, setEditingIpClientId] = useState<string | null>(null);
  const [editingIpValue, setEditingIpValue] = useState('');
  const [editingIpLoading, setEditingIpLoading] = useState(false);
  const [scriptMode, setScriptMode] = useState<'full' | 'quick'>('full');
  const [vpnClientSaved, setVpnClientSaved] = useState(false);

  const [vpnFormData, setVpnFormData] = useState({
    name: '',
    description: '',
    vpnServerId: '',
    vpnType: 'wireguard' as 'l2tp' | 'pptp' | 'sstp' | 'wireguard',
    customVpnIp: '',
    localNetworks: '',
    targetWinboxPort: '8291',
    targetApiPort: '8728',
    targetWwwPort: '80',
  });

  const [wgServerInfo, setWgServerInfo] = useState<{
    installed: boolean;
    publicIp?: string;
    publicKey?: string;
    listenPort?: number;
    subnet?: string;
    poolStart?: number | string;
    poolEnd?: number | string;
    gatewayIp?: string;
  } | null>(null);
  const [wgServerInfoLoading, setWgServerInfoLoading] = useState(false);

  const [l2tpServerInfo, setL2tpServerInfo] = useState<{
    installed: boolean;
    publicIp?: string;
    ipsecPsk?: string;
    subnet?: string;
    localIp?: string;
    poolStart?: number | string;
    poolEnd?: number | string;
    gateway?: string;
  } | null>(null);
  const [l2tpServerInfoLoading, setL2tpServerInfoLoading] = useState(false);

  // ── Step 3: Router MikroTik Management State ─────────────────────────
  const [routersList, setRoutersList] = useState<Router[]>([]);
  const [routerStatusMap, setRouterStatusMap] = useState<Record<string, RouterStatus>>({});
  const [loadingRouters, setLoadingRouters] = useState(false);
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [editingRouter, setEditingRouter] = useState<Router | null>(null);
  const [useVpnClientInRouter, setUseVpnClientInRouter] = useState(true);
  const [testingRouterConn, setTestingRouterConn] = useState(false);
  const [routerConnTestResult, setRouterConnTestResult] = useState<{
    success: boolean;
    message: string;
    identity?: string;
    fixScript?: string;
    usedPort?: number;
    usedTls?: boolean;
  } | null>(null);
  const [savingRouterItem, setSavingRouterItem] = useState(false);
  const [routerSaved, setRouterSaved] = useState(false);
  const [savedRouterId, setSavedRouterId] = useState<string | null>(null);

  const [routerFormData, setRouterFormData] = useState({
    name: 'Router Utama',
    nasname: '',
    shortname: '',
    type: 'mikrotik',
    ipAddress: '',
    username: '',
    password: '',
    port: '8728',
    apiPort: '8729',
    winboxPort: '8291',
    wwwPort: '80',
    secret: 'secret123',
    ports: '1812',
    server: '',
    community: '',
    description: '',
    vpnClientId: '',
    authMode: 'local',
  });

  const [settingUpRadiusId, setSettingUpRadiusId] = useState<string | null>(null);
  const [settingUpHotspotId, setSettingUpHotspotId] = useState<string | null>(null);
  const [showRadiusScriptModal, setShowRadiusScriptModal] = useState(false);
  const [radiusScriptModalData, setRadiusScriptModalData] = useState<{
    script: string;
    scriptRos6?: string;
    scriptRos7?: string;
    config: any;
  } | null>(null);
  const [radiusScriptRosTab, setRadiusScriptRosTab] = useState<6 | 7>(7);
  const [showHotspotSetupModal, setShowHotspotSetupModal] = useState(false);
  const [hotspotModalData, setHotspotModalData] = useState<{
    router: Router;
    script: string;
    scriptRos6?: string;
    scriptRos7?: string;
    config: any;
  } | null>(null);
  const [hotspotRosTab, setHotspotRosTab] = useState<6 | 7>(7);
  const [applyingHotspot, setApplyingHotspot] = useState(false);
  const [hotspotForm, setHotspotForm] = useState({
    vlanId: '10',
    parentInterface: 'bridge-LAN',
    hotspotAddress: '10.50.10.1',
    hotspotSubnet: '10.50.10.0/24',
    poolRange: '10.50.10.10-10.50.10.250',
    dnsName: 'wifi.hotspot.local',
  });

  // Step 4: Isolation Settings State
  const [isolationForm, setIsolationForm] = useState({
    isolationEnabled: true,
    isolationIpPool: '192.168.200.0/24',
    isolationServerIp: '43.173.14.236',
    isolationRateLimit: '64k/64k',
    isolationAllowDns: true,
    isolationAllowPayment: true,
  });
  const [isSavingIsolation, setIsSavingIsolation] = useState(false);
  const [isolationRosVersion, setIsolationRosVersion] = useState<'ros7' | 'ros6'>('ros7');
  const [isolationAuthMode, setIsolationAuthMode] = useState<'local' | 'radius'>('local');

  // Step 5: Profile Form State
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
  const [pushingIsolation, setPushingIsolation] = useState(false);
  const [verifyingIsolation, setVerifyingIsolation] = useState(false);
  const [isolationVerificationResult, setIsolationVerificationResult] = useState<any | null>(null);
  const [isolationPushResult, setIsolationPushResult] = useState<any | null>(null);
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

  // Require Admin Login if system is already initialized
  useEffect(() => {
    if (!checkingInit && isInitialized && sessionStatus === 'unauthenticated') {
      router.replace('/admin/login?callbackUrl=/setup');
    }
  }, [checkingInit, isInitialized, sessionStatus, router]);

  // Fetch initial wizard data
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
          const routers: Router[] = rData.routers || (Array.isArray(rData) ? rData : []);
          setRoutersList(routers);
          rCount = routers.length;
          if (routers.length > 0) {
            setSavedRouterId(routers[0].id);
            setRouterSaved(true);
            newCompletedSteps.push(3);
            checkRoutersStatus(routers.map((r) => r.id));
          }
        }

        if (profilesRes.status === 'fulfilled' && profilesRes.value.ok) {
          const pData = await profilesRes.value.json();
          const profiles = pData.profiles || (Array.isArray(pData) ? pData : []);
          if (profiles.length > 0) {
            newCompletedSteps.push(5);
          }
        }

        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const uData = await usersRes.value.json();
          const users = uData.users || (Array.isArray(uData) ? uData : []);
          uCount = users.length;
          if (uCount > 0) {
            newCompletedSteps.push(6);
          }
        }

        if (waRes.status === 'fulfilled' && waRes.value.ok) {
          const wData = await waRes.value.json();
          if (Array.isArray(wData) && wData.length > 0) {
            setWaProviders(wData);
            const active = wData.some((p: any) => p.isActive);
            setWaConnected(active);
            if (active) newCompletedSteps.push(8);
          }
        }

        setCompletedSteps(Array.from(new Set(newCompletedSteps)));
        setExistingStats({ routerCount: rCount, userCount: uCount });
        if (rCount > 0 || uCount > 0) {
          setHasExistingData(true);
        }

        await loadVpnClients();
        loadWgServerInfo();
        loadL2tpServerInfo();
      } catch (err) {
        console.error('Failed loading wizard data:', err);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, sessionStatus]);

  // VPN Server resolving helper
  const resolveServer = (vpnServerId: string) => {
    if (vpnServerId === '__vps_wg_server__' || vpnServerId === '__vps_wg__') {
      return {
        name: 'VPS WireGuard Server',
        host: wgServerInfo?.publicIp || '43.173.14.236',
        subnet: wgServerInfo?.subnet || '10.200.0.0/24',
        wgPublicKey: wgServerInfo?.publicKey || null,
        wgPort: wgServerInfo?.listenPort || 51820,
        wgEnabled: true,
        l2tpEnabled: false,
      };
    }
    if (vpnServerId === '__vps_l2tp_server__' || vpnServerId === '__vps_l2tp__') {
      return {
        name: 'VPS L2TP Server',
        host: l2tpServerInfo?.publicIp || '43.173.14.236',
        subnet: l2tpServerInfo?.subnet || '10.201.0.0/24',
        wgPublicKey: null,
        wgPort: null,
        wgEnabled: false,
        l2tpEnabled: true,
      };
    }
    return vpnServersList.find((s) => s.id === vpnServerId) || null;
  };

  const loadVpnClients = async () => {
    setVpnLoading(true);
    try {
      const response = await fetch('/api/network/vpn-client');
      const data = await response.json();
      const list: VpnClient[] = data.clients || [];
      setVpnClientsList(list);
      setVpnServersList(data.vpnServers || []);
      if (list.length > 0) {
        setVpnClientSaved(true);
        markStepCompleted(2);
        if (!routerFormData.vpnClientId) {
          const latest = list[list.length - 1];
          handleVpnClientChange(latest.id, list);
        }
      }
    } catch (error) {
      console.error('Load vpn clients error:', error);
    } finally {
      setVpnLoading(false);
    }
  };

  const loadWgServerInfo = async () => {
    if (wgServerInfo !== null) return;
    setWgServerInfoLoading(true);
    try {
      const res = await fetch('/api/network/vps-wg-peer');
      const data = await res.json();
      if (data.installed) {
        setWgServerInfo({
          installed: true,
          publicIp: data.publicIp,
          publicKey: data.publicKey,
          listenPort: data.listenPort,
          subnet: data.subnet,
          poolStart: data.poolStart,
          poolEnd: data.poolEnd,
          gatewayIp: data.gatewayIp,
        });
      } else {
        setWgServerInfo({ installed: false });
      }
    } catch {
      setWgServerInfo({ installed: false });
    } finally {
      setWgServerInfoLoading(false);
    }
  };

  const loadL2tpServerInfo = async () => {
    if (l2tpServerInfo !== null) return;
    setL2tpServerInfoLoading(true);
    try {
      const res = await fetch('/api/network/vps-l2tp-info');
      const data = await res.json();
      setL2tpServerInfo(
        data.installed
          ? {
              installed: true,
              publicIp: data.publicIp,
              ipsecPsk: data.ipsecPsk,
              subnet: data.subnet,
              localIp: data.localIp,
              poolStart: data.poolStart,
              poolEnd: data.poolEnd,
              gateway: data.gateway,
            }
          : { installed: false }
      );
    } catch {
      setL2tpServerInfo({ installed: false });
    } finally {
      setL2tpServerInfoLoading(false);
    }
  };

  const handleCreateVpnClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetPorts = {
      winbox: parseInt(vpnFormData.targetWinboxPort) || 8291,
      api: parseInt(vpnFormData.targetApiPort) || 8728,
      www: parseInt(vpnFormData.targetWwwPort) || 80,
    };

    if (vpnFormData.vpnType === 'wireguard' && vpnFormData.vpnServerId === '__vps_wg__') {
      if (!vpnFormData.name.trim()) return;
      const peerName = vpnFormData.name.trim();
      const localNetworks = vpnFormData.localNetworks.trim();
      setShowAddVpnModal(false);
      setCreatingVpnClient(true);
      try {
        const res = await fetch('/api/network/vps-wg-peer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', nasName: peerName, localNetworks: localNetworks || undefined, targetPorts }),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess(`WireGuard peer "${peerName}" berhasil ditambahkan! VPN IP: ${data.vpnIp}`, 'Peer Ditambahkan');
          const wgSubnet = data.vpnSubnet || wgServerInfo?.subnet || '10.200.0.0/24';
          const wgGatewayIp = data.gatewayIp || wgSubnet.replace(/\.\d+\/\d+$/, '.1');
          const vpsIp = data.vpsPublicIp || wgServerInfo?.publicIp || data.serverEndpoint?.split(':')[0] || 'VPS';
          const winboxPublicPort = data.publicPorts?.services?.winbox?.public;
          const winboxRemoteStr = winboxPublicPort ? `${vpsIp}:${winboxPublicPort}` : undefined;

          const newCreds: Credentials = {
            server: vpsIp,
            serverHost: vpsIp,
            username: peerName,
            nasName: peerName,
            password: '',
            vpnIp: data.vpnIp,
            vpnType: 'wireguard',
            clientPrivateKey: data.clientPrivateKey || null,
            serverPublicKey: data.serverPublicKey || wgServerInfo?.publicKey || null,
            wgPort: data.wgPort || wgServerInfo?.listenPort || 51820,
            wgSubnet,
            wgGatewayIp,
            nasSecret: data.nasSecret || undefined,
            apiUsername: data.apiUsername || undefined,
            apiPassword: data.apiPassword || undefined,
            winboxRemote: winboxRemoteStr,
            publicPorts: data.publicPorts,
            vpsPublicIp: vpsIp,
          };
          setCredentials(newCreds);
          setSelectedVpnType('wireguard');
          setShowCredentialsModal(true);
          setVpnFormData({
            name: '',
            description: '',
            vpnServerId: '',
            vpnType: 'wireguard',
            customVpnIp: '',
            localNetworks: '',
            targetWinboxPort: '8291',
            targetApiPort: '8728',
            targetWwwPort: '80',
          });
          await loadVpnClients();
        } else {
          showError(data.error || 'Gagal menambahkan WireGuard peer ke VPS');
        }
      } catch {
        showError('Gagal menghubungi VPS');
      } finally {
        setCreatingVpnClient(false);
      }
      return;
    }

    if (vpnFormData.vpnType === 'l2tp' && vpnFormData.vpnServerId === '__vps_l2tp__') {
      if (!vpnFormData.name.trim()) return;
      setCreatingVpnClient(true);
      try {
        const res = await fetch('/api/network/vps-l2tp-peer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', label: vpnFormData.name.trim(), localNetworks: vpnFormData.localNetworks.trim() || undefined, targetPorts }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddVpnModal(false);
          const ipsecPsk = data.ipsecPsk || l2tpServerInfo?.ipsecPsk || '';
          const nasDisplayName = vpnFormData.name.trim();
          const safeApiUser = data.apiUsername || `api-${nasDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const safeApiPass = data.apiPassword || 'EugineBillApi123!';
          const vpsIp = data.vpsPublicIp || l2tpServerInfo?.publicIp || 'VPS';
          const winboxPublicPort = data.publicPorts?.services?.winbox?.public;
          const winboxRemoteStr = winboxPublicPort ? `${vpsIp}:${winboxPublicPort}` : undefined;

          const newCreds: Credentials = {
            server: vpsIp,
            serverHost: vpsIp,
            username: data.username,
            password: data.password,
            vpnIp: data.vpnIp,
            vpnType: 'l2tp',
            nasName: nasDisplayName,
            ipsecPsk,
            apiUsername: safeApiUser,
            apiPassword: safeApiPass,
            nasSecret: data.nasSecret || undefined,
            winboxRemote: winboxRemoteStr,
            publicPorts: data.publicPorts,
            vpsPublicIp: vpsIp,
          };
          setCredentials(newCreds);
          setSelectedVpnType('l2tp');
          setShowCredentialsModal(true);
          showSuccess('L2TP user berhasil ditambahkan ke VPS', 'Berhasil');
          setVpnFormData({
            name: '',
            description: '',
            vpnServerId: '',
            vpnType: 'l2tp',
            customVpnIp: '',
            localNetworks: '',
            targetWinboxPort: '8291',
            targetApiPort: '8728',
            targetWwwPort: '80',
          });
          await loadVpnClients();
        } else {
          showError(data.error || 'Gagal menambahkan L2TP user ke VPS');
        }
      } catch {
        showError('Gagal menghubungi VPS');
      } finally {
        setCreatingVpnClient(false);
      }
      return;
    }

    // External CHR / standard flow
    setCreatingVpnClient(true);
    try {
      const response = await fetch('/api/network/vpn-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vpnFormData),
      });
      const result = await response.json();
      if (result.success) {
        setCredentials(result.credentials);
        const createdType = String(result.credentials?.vpnType || 'l2tp').toLowerCase();
        setSelectedVpnType(createdType === 'pptp' || createdType === 'sstp' || createdType === 'wireguard' ? (createdType as any) : 'l2tp');
        setShowCredentialsModal(true);
        setShowAddVpnModal(false);
        setVpnFormData({
          name: '',
          description: '',
          vpnServerId: '',
          vpnType: 'wireguard',
          customVpnIp: '',
          localNetworks: '',
          targetWinboxPort: '8291',
          targetApiPort: '8728',
          targetWwwPort: '80',
        });
        await loadVpnClients();
        showSuccess('Client VPN berhasil dibuat! Kredensial & skrip ditampilkan.', 'Berhasil');
      } else {
        showError(result.error || 'Gagal membuat Client VPN');
      }
    } catch {
      showError('Terjadi kesalahan saat membuat client VPN');
    } finally {
      setCreatingVpnClient(false);
    }
  };

  const handleDeleteVpnClient = async (id: string, name: string) => {
    const confirmed = await showConfirm(
      `Ini akan menghapus VPN client "${name}" dari server dan database.`,
      'Hapus VPN Client?'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/network/vpn-client?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        showSuccess(`VPN Client "${name}" berhasil dihapus.`);
        loadVpnClients();
      } else {
        showError('Gagal menghapus VPN Client');
      }
    } catch {
      showError('Terjadi kesalahan saat menghapus VPN Client');
    }
  };

  const handleToggleRadiusServer = async (clientId: string, isRadiusServer: boolean) => {
    try {
      const response = await fetch('/api/network/vpn-client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, isRadiusServer }),
      });
      if (response.ok) {
        showSuccess(isRadiusServer ? 'Berhasil dijadikan RADIUS server' : 'Status RADIUS server dinonaktifkan');
        loadVpnClients();
      } else {
        showError('Gagal memperbarui status RADIUS');
      }
    } catch {
      showError('Terjadi kesalahan sistem');
    }
  };

  const handleEditIpSave = async (clientId: string) => {
    if (!editingIpValue.trim()) return;
    setEditingIpLoading(true);
    try {
      const res = await fetch('/api/network/vpn-client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, vpnIp: editingIpValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`IP berhasil diubah ke ${data.newIp}`);
        setEditingIpClientId(null);
        loadVpnClients();
      } else {
        showError(data.error || 'Gagal mengubah IP');
      }
    } catch {
      showError('Gagal menghubungi server');
    } finally {
      setEditingIpLoading(false);
    }
  };

  const viewCredentials = (client: VpnClient) => {
    const server = resolveServer(client.vpnServerId);
    if (!server) return;

    const normalizedClientType = String(client.vpnType || 'l2tp').toLowerCase();
    const clientVpnType = (
      normalizedClientType === 'pptp' || normalizedClientType === 'sstp' || normalizedClientType === 'wireguard'
        ? normalizedClientType
        : 'l2tp'
    ) as 'l2tp' | 'pptp' | 'sstp' | 'wireguard';
    const radiusServer = vpnClientsList.find((c) => c.isRadiusServer);

    setCredentials({
      server: server.host,
      serverHost: server.host,
      username: client.username,
      password: client.password,
      vpnIp: client.vpnIp,
      nasName: client.name,
      winboxPort: client.winboxPort || undefined,
      winboxRemote: client.winboxPort ? `${server.host}:${client.winboxPort}` : undefined,
      apiUsername: client.apiUsername || undefined,
      apiPassword: client.apiPassword || undefined,
      vpnType: clientVpnType,
      nasSecret: client.nasSecret || undefined,
      radiusServerIp: !client.isRadiusServer && radiusServer ? radiusServer.vpnIp : undefined,
      ipsecPsk: String(client.vpnType || '').toLowerCase() === 'l2tp' ? l2tpServerInfo?.ipsecPsk || '' : undefined,
      clientPrivateKey: client.clientPrivateKey || null,
      serverPublicKey: server.wgPublicKey || null,
      wgPort: server.wgPort || null,
      publicPorts: client.publicPorts || null,
      vpsPublicIp: server.host,
      wgSubnet: wgServerInfo?.subnet || server.subnet || '10.200.0.0/24',
      wgGatewayIp: wgServerInfo?.subnet
        ? wgServerInfo.subnet.replace(/\.\d+\/\d+$/, '.1')
        : server.subnet?.replace(/\.\d+\/\d+$/, '.1') || '10.200.0.1',
    });
    setSelectedVpnType(clientVpnType);
    setShowCredentialsModal(true);
  };

  const generateMikroTikScript = () => {
    if (!credentials) return '';

    const nasDisplayName = credentials.nasName || credentials.username;
    const safeLabel = nasDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 12) || 'vpn';
    const safeApiUsername = credentials.apiUsername || `api-${credentials.vpnIp?.replace(/\./g, '-')}`;
    const safeApiPassword = credentials.apiPassword || 'EugineBillApi123!';
    const vpsIp = credentials.vpsPublicIp || credentials.serverHost || credentials.server || 'VPS_IP';
    const ports = credentials.publicPorts?.services || {};
    const winboxPort = ports.winbox?.public || credentials.winboxPort || 10001;
    const winboxTarget = ports.winbox?.target || 8291;
    const apiPort = ports.api?.public || 10002;
    const apiTarget = ports.api?.target || 8728;
    const wwwPort = ports.www?.public || 10004;
    const wwwTarget = ports.www?.target || 80;
    const sshPort = ports.ssh?.public || 10006;
    const sshTarget = ports.ssh?.target || 22;

    if (selectedVpnType === 'l2tp') {
      const ifaceName = `ebl2-${safeLabel}`;
      if (scriptMode === 'quick') {
        return `:do {/interface l2tp-client remove [find comment="euginebill-${credentials.username}"]} on-error={}
:do {/interface l2tp-client remove [find name="${ifaceName}"]} on-error={}
:do {/interface l2tp-client remove [find name="l2tp-${safeLabel}"]} on-error={}
:if ([:len [/ppp profile find name="ebvpn-remote"]] = 0) do={/ppp profile add name=ebvpn-remote use-encryption=no change-tcp-mss=yes only-one=no}
/interface l2tp-client add name=${ifaceName} connect-to=${credentials.server} user=${credentials.username} password="${credentials.password}" profile=ebvpn-remote use-ipsec=no allow=chap,mschap2 disabled=no add-default-route=no dial-on-demand=no comment=euginebill-${credentials.username}`.trim();
      }

      return `# ============================================================
# MikroTik L2TP VPN Client Setup Script (UltraVPN Standard)
# NAS Name    : ${nasDisplayName}
# NAS VPN IP  : ${credentials.vpnIp}
# VPN Server  : ${credentials.server}
#
# ────────────────────────────────────────────────────────────
# ALOKASI REMOTE AKSES PUBLIK (Akses dari Internet / Luar):
# Host VPS    : ${vpsIp}
# Winbox Port : ${vpsIp}:${winboxPort} -> MikroTik:${winboxTarget}
# WebGUI Port : http://${vpsIp}:${wwwPort} -> MikroTik:${wwwTarget}
# API Port    : ${vpsIp}:${apiPort} -> MikroTik:${apiTarget}
# SSH Port    : ${vpsIp}:${sshPort} -> MikroTik:${sshTarget}
#
# KREDENSIAL REMOTE MIKROTIK (Khusus Sistem EugineBill & Winbox):
# API & Winbox Username: ${safeApiUsername}
# API & Winbox Password: ${safeApiPassword}
# ============================================================

# 0. Hapus konfigurasi lama jika ada (Idempoten & Bebas Error)
:do { /interface l2tp-client remove [find comment="euginebill-${credentials.username}"] } on-error={}
:do { /interface l2tp-client remove [find comment~"EugineBill"] } on-error={}
:do { /interface l2tp-client remove [find name="${ifaceName}"] } on-error={}
:do { /interface l2tp-client remove [find name="l2tp-${safeLabel}"] } on-error={}
:do { /interface l2tp-client remove [find name="l2tp-client-EugineBill"] } on-error={}
:do { /user remove [find name="${safeApiUsername}"] } on-error={}
:do { /user remove [find comment~"EugineBill"] } on-error={}

# 1. Profile PPP Khusus VPN Remote (MSS Clamping & Tanpa MPPE Encryption)
:if ([:len [/ppp profile find name="ebvpn-remote"]] = 0) do={/ppp profile add name=ebvpn-remote use-encryption=no change-tcp-mss=yes only-one=no}

# 2. Setup L2TP Client (UltraVPN Standard)
/interface l2tp-client add name=${ifaceName} connect-to=${credentials.server} user=${credentials.username} password="${credentials.password}" profile=ebvpn-remote use-ipsec=no allow=chap,mschap2 disabled=no add-default-route=no dial-on-demand=no comment="euginebill-${credentials.username}"

# 3. Buat User Remote Admin (Akses Penuh: Winbox, API, WebFig, SSH)
:do { /user remove [find name="${safeApiUsername}"] } on-error={}
:do { /user remove [find comment~"EugineBill"] } on-error={}
/user add name=${safeApiUsername} group=full password="${safeApiPassword}" comment="Remote Admin User EugineBill (Winbox & API)"

# 4. Konfigurasi Port Layanan MikroTik Aktif & Bebas Restriksi IP (Universal ROS 6 & 7)
:do { /ip service set winbox port=${winboxTarget} address="" disabled=no } on-error={}
:do { /ip service set api port=${apiTarget} address="" disabled=no } on-error={}
:do { /ip service set www port=${wwwTarget} address="" disabled=no } on-error={}
:do { /ip service set ssh address="" disabled=no } on-error={}

# 5. Izinkan Akses Masuk API & VPN di Baris Teratas Firewall Filter MikroTik
:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=${apiTarget},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}
:do { /ip firewall filter add chain=input action=accept in-interface=${ifaceName} place-before=0 comment="Allow EugineBill VPN Remote Access" } on-error={}

# ============================================================
# PANDUAN PENGGUNAAN:
# 1. Remote Winbox  : Buka Winbox -> Connect To: ${vpsIp}:${winboxPort} (Login: ${safeApiUsername} / Pass: ${safeApiPassword} atau Admin Anda)
# 2. Remote WebFig  : Buka Browser -> http://${vpsIp}:${wwwPort}
# 3. Pengaturan NAS di EugineBill:
#    - Host IP : ${credentials.vpnIp} (atau ${vpsIp})
#    - API Port: ${apiTarget} (atau ${apiPort})
#    - Username: ${safeApiUsername}
#    - Password: ${safeApiPassword}
# ============================================================`.trim();
    }

    if (selectedVpnType === 'wireguard') {
      const ifaceName = toSafeIfaceName('wg', nasDisplayName);
      const serverPk = credentials.serverPublicKey || '<SERVER_PUBLIC_KEY>';
      const clientPk = credentials.clientPrivateKey || '<CLIENT_PRIVATE_KEY>';
      const wgPort = credentials.wgPort || 51820;
      const serverHost = credentials.serverHost || credentials.server;
      const wgSubnet = credentials.wgSubnet || '10.200.0.0/24';
      const wgGatewayIp = credentials.wgGatewayIp || wgSubnet.replace(/\.\d+\/\d+$/, '.1');
      const apiSslPort = ports.apiSsl?.public || 10003;
      const apiSslTarget = ports.apiSsl?.target || 8729;

      return `# ============================================================
# MikroTik WireGuard Client Setup Script (RouterOS 7+)
# NAS Name    : ${nasDisplayName}
# NAS VPN IP  : ${credentials.vpnIp}
# VPN Subnet  : ${wgSubnet}
# VPS Gateway : ${wgGatewayIp}
#
# ────────────────────────────────────────────────────────────
# ALOKASI REMOTE AKSES PUBLIK (Akses dari Internet / Luar):
# Host VPS    : ${vpsIp}
# Winbox Port : ${vpsIp}:${winboxPort} -> MikroTik:${winboxTarget}
# WebGUI Port : http://${vpsIp}:${wwwPort} -> MikroTik:${wwwTarget}
# API Port    : ${vpsIp}:${apiPort} -> MikroTik:${apiTarget}
# API SSL Port: ${vpsIp}:${apiSslPort} -> MikroTik:${apiSslTarget}
# SSH Port    : ${vpsIp}:${sshPort} -> MikroTik:${sshTarget}
#
# KREDENSIAL REMOTE MIKROTIK (Khusus Sistem EugineBill & Winbox):
# API & Winbox Username: ${safeApiUsername}
# API & Winbox Password: ${safeApiPassword}
# ============================================================

# 0. Hapus setup WireGuard & User terdahulu (mencegah bentrok / sisa config)
:do { /interface/wireguard/peers/remove [find where endpoint-address="${serverHost}" or interface~"wg-"] } on-error={}
:do { /interface/wireguard/remove [find where name="${ifaceName}" or name~"wg-"] } on-error={}
:do { /ip/address/remove [find where address~"${credentials.vpnIp}" or interface~"wg-"] } on-error={}
:do { /ip/route/remove [find where comment="EugineBill-VPN" or comment~"EugineBill" or gateway~"wg-"] } on-error={}
:do { /user/remove [find where name="${safeApiUsername}" or comment~"EugineBill"] } on-error={}

# 1. Buat WireGuard interface dengan private key NAS
/interface/wireguard/add name=${ifaceName} private-key="${clientPk}"

# 2. Tambah peer (VPS WireGuard server)
#    allowed-address = subnet VPN agar semua host VPN dapat diakses
/interface/wireguard/peers/add interface=${ifaceName} public-key="${serverPk}" endpoint-address="${serverHost}" endpoint-port=${wgPort} allowed-address="${wgSubnet}" persistent-keepalive=25

# 3. Assign IP address NAS ke interface WireGuard
/ip/address/remove [find where interface=${ifaceName}]
/ip/address/add address=${credentials.vpnIp}/32 interface=${ifaceName}

# 4. Route seluruh subnet VPN melalui WireGuard
/ip/route/remove [find where comment="EugineBill-VPN"]
/ip/route/add dst-address=${wgSubnet} gateway=${ifaceName} comment="EugineBill-VPN"

# 5. Buat User Remote Admin (Akses Penuh: Winbox, API, WebFig, SSH)
:do { /user/remove [find name="${safeApiUsername}"] } on-error={}
/user/add name=${safeApiUsername} group=full password="${safeApiPassword}" comment="Remote Admin User EugineBill (Winbox & API)"

# 6. Pastikan Port Layanan MikroTik Aktif & Bebas Restriksi IP
:do { /ip/service/set winbox port=${winboxTarget} address="" disabled=no } on-error={}
:do { /ip/service/set api port=${apiTarget} address="" disabled=no } on-error={}
:do { /ip/service/set www port=${wwwTarget} address="" disabled=no } on-error={}
:do { /ip/service/set ssh address="" disabled=no } on-error={}

# 7. Izinkan Akses Masuk WireGuard & API di Baris Teratas Firewall Filter MikroTik
:do { /ip/firewall/filter/add chain=input action=accept protocol=tcp dst-port=${apiTarget},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}
:do { /ip/firewall/filter/add chain=input action=accept in-interface=${ifaceName} place-before=0 comment="Allow EugineBill VPN Remote Access" } on-error={}

# ============================================================
# PANDUAN PENGGUNAAN:
# 1. Remote Winbox  : Buka Winbox -> Connect To: ${vpsIp}:${winboxPort} (Login: ${safeApiUsername} / Pass: ${safeApiPassword} atau Admin Anda)
# 2. Remote WebFig  : Buka Browser -> http://${vpsIp}:${wwwPort}
# 3. Pengaturan NAS di EugineBill:
#    - Host IP : ${credentials.vpnIp} (atau ${vpsIp})
#    - API Port: ${apiTarget} (atau ${apiPort})
#    - Username: ${safeApiUsername}
#    - Password: ${safeApiPassword}
# ============================================================`.trim();
    }

    if (selectedVpnType === 'sstp') {
      const ifaceName = toSafeIfaceName('sstp', nasDisplayName);
      return `:do { /interface sstp-client remove [find where name="${ifaceName}" or comment~"EugineBill"] } on-error={}
:do { /user remove [find name="${safeApiUsername}" or comment~"EugineBill"] } on-error={}
/user add name=${safeApiUsername} group=full password="${safeApiPassword}" comment="Remote Admin User EugineBill (Winbox & API)"
/interface sstp-client add connect-to=${credentials.server} port=992 user=${credentials.username} password=${credentials.password} disabled=no name=${ifaceName} add-default-route=no authentication=mschap2 certificate=none comment="EugineBill VPN"
:do { /ip service set winbox port=${winboxTarget} address="" disabled=no } on-error={}
:do { /ip service set api port=${apiTarget} address="" disabled=no } on-error={}
:do { /ip service set www port=${wwwTarget} address="" disabled=no } on-error={}
:do { /ip service set ssh address="" disabled=no } on-error={}
:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=${apiTarget},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}
:do { /ip firewall filter add chain=input action=accept in-interface=${ifaceName} place-before=0 comment="Allow EugineBill VPN Remote Access" } on-error={}`.trim();
    }

    return `:do { /interface pptp-client remove [find where name="pptp-${safeLabel}" or comment~"EugineBill"] } on-error={}
:do { /user remove [find name="${safeApiUsername}" or comment~"EugineBill"] } on-error={}
/user add name=${safeApiUsername} group=full password="${safeApiPassword}" comment="Remote Admin User EugineBill (Winbox & API)"
/interface pptp-client add connect-to=${credentials.server} user=${credentials.username} password=${credentials.password} disabled=no name="pptp-${safeLabel}" add-default-route=no comment="EugineBill VPN"
:do { /ip service set winbox port=${winboxTarget} address="" disabled=no } on-error={}
:do { /ip service set api port=${apiTarget} address="" disabled=no } on-error={}
:do { /ip service set www port=${wwwTarget} address="" disabled=no } on-error={}
:do { /ip service set ssh address="" disabled=no } on-error={}
:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=${apiTarget},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}
:do { /ip firewall filter add chain=input action=accept in-interface="pptp-${safeLabel}" place-before=0 comment="Allow EugineBill VPN Remote Access" } on-error={}`.trim();
  };

  // ── Step 3: Router Management Helpers ─────────────────────────────────
  const loadRoutersList = async () => {
    setLoadingRouters(true);
    try {
      const response = await fetch('/api/network/routers');
      const data = await response.json();
      const list: Router[] = data.routers || [];
      setRoutersList(list);
      if (list.length > 0) {
        setRouterSaved(true);
        markStepCompleted(3);
        setSavedRouterId(list[0].id);
        checkRoutersStatus(list.map((r) => r.id));
      }
    } catch (error) {
      console.error('Failed to load routers:', error);
    } finally {
      setLoadingRouters(false);
    }
  };

  const checkRoutersStatus = async (routerIds: string[]) => {
    if (!routerIds.length) return;
    try {
      const response = await fetch('/api/network/routers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerIds }),
      });
      if (response.ok) {
        const data = await response.json();
        setRouterStatusMap(data.statusMap || {});
      }
    } catch (error) {
      console.error('Check status error:', error);
    }
  };

  const handleVpnClientChange = (vpnClientId: string, overrideList?: VpnClient[]) => {
    const list = overrideList || vpnClientsList;
    if (vpnClientId) {
      const vpnClient = list.find((v) => v.id === vpnClientId);
      if (vpnClient) {
        const vpnApiTarget = (vpnClient as any).publicPorts?.services?.api?.target?.toString();
        const vpnWinboxTarget = (vpnClient as any).publicPorts?.services?.winbox?.target?.toString();
        const vpnWwwTarget = (vpnClient as any).publicPorts?.services?.www?.target?.toString();
        setRouterFormData((prev) => ({
          ...prev,
          name: prev.name && prev.name !== 'Router Utama' ? prev.name : vpnClient.name,
          vpnClientId,
          ipAddress: vpnClient.vpnIp,
          nasname: vpnClient.vpnIp,
          username: vpnClient.resolvedUsername || vpnClient.apiUsername || prev.username || `api-${toSafeIfaceName('vpn', vpnClient.name)}`,
          password: vpnClient.resolvedPassword || vpnClient.apiPassword || prev.password || 'EugineBillApi123!',
          secret: vpnClient.nasSecret || prev.secret || 'secret123',
          ...(vpnApiTarget ? { port: vpnApiTarget } : {}),
          ...(vpnWinboxTarget ? { winboxPort: vpnWinboxTarget } : {}),
          ...(vpnWwwTarget ? { wwwPort: vpnWwwTarget } : {}),
        }));
      }
    } else {
      setRouterFormData((prev) => ({ ...prev, vpnClientId: '', ipAddress: '', nasname: '', wwwPort: '80' }));
    }
  };

  const handleTestRouterConnection = async () => {
    const isGateway = routerFormData.type === 'gateway' || routerFormData.name.toLowerCase().includes('gateway');

    if (!isGateway && (!routerFormData.ipAddress || !routerFormData.username || !routerFormData.password)) {
      showError('Harap isi Alamat IP, Username, dan Password MikroTik.');
      return;
    }

    if (isGateway && !routerFormData.ipAddress) {
      showError('Harap isi Alamat IP Gateway VPS.');
      return;
    }

    setTestingRouterConn(true);
    setRouterConnTestResult(null);

    try {
      if (isGateway) {
        const response = await fetch('/api/network/routers/test-gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipAddress: routerFormData.ipAddress }),
        });
        const result = await response.json();
        setRouterConnTestResult(result);
        if (result.success) {
          showSuccess(`Gateway VPS dapat dijangkau: ${result.message}`);
        } else {
          showError(result.message);
        }
        return;
      }

      if (routerFormData.vpnClientId) {
        const pingRes = await fetch('/api/network/routers/test-gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipAddress: routerFormData.ipAddress }),
        });
        const pingResult = await pingRes.json();
        if (!pingResult.success) {
          setRouterConnTestResult({ success: false, message: `VPN tidak terhubung: ${pingResult.message}` });
          showError(`VPN tidak terhubung ke ${routerFormData.ipAddress}`);
          return;
        }
      }

      const response = await fetch('/api/network/routers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: routerFormData.ipAddress,
          username: routerFormData.username,
          password: routerFormData.password,
          port: parseInt(routerFormData.port) || 8728,
          apiPort: parseInt(routerFormData.apiPort) || 8729,
          vpnClientId: routerFormData.vpnClientId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.usedPort && result.usedPort !== parseInt(routerFormData.port)) {
          setRouterFormData((prev) => ({
            ...prev,
            port: result.usedPort.toString(),
          }));
        }
        setRouterConnTestResult(result);
        const portInfo = result.usedTls ? ` (port ${result.usedPort} SSL)` : ` (port ${result.usedPort})`;
        showSuccess(`Koneksi berhasil ke router "${result.identity}"${portInfo}`);
      } else {
        const apiPort = parseInt(routerFormData.port) || 8728;
        const fixScript =
          result.fixScript ||
          `/ip service set api port=${apiPort} disabled=no address=""\n/ip firewall filter add chain=input action=accept protocol=tcp dst-port=${apiPort},8728 place-before=0 comment="Allow EugineBill VPS API"`;

        setRouterConnTestResult({ ...result, fixScript });
        const diagMsg =
          result.diagnosis === 'port_refused'
            ? `${result.message}\n\nPort ${apiPort} ditolak (ECONNREFUSED) — pastikan /ip service api sudah enabled dan port benar.`
            : result.diagnosis === 'auth_failed'
            ? `${result.message}\n\nUsername/password salah — cek kredensial user API.`
            : result.diagnosis === 'firewall_block'
            ? `${result.message}\n\nKoneksi timeout — firewall MikroTik memblokir port ${apiPort}.`
            : result.message;
        showError(diagMsg);
      }
    } catch (error: any) {
      showError(error.message || 'Gagal mengetes koneksi');
      setRouterConnTestResult({ success: false, message: error.message || 'Gagal mengetes koneksi' });
    } finally {
      setTestingRouterConn(false);
    }
  };

  const handleSaveRouterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRouterItem(true);

    try {
      const url = '/api/network/routers';
      const method = editingRouter ? 'PUT' : 'POST';
      const body = editingRouter ? { ...routerFormData, id: editingRouter.id } : routerFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(editingRouter ? 'Router berhasil diperbarui!' : 'Router berhasil ditambahkan & terhubung!');
        setShowRouterModal(false);
        setEditingRouter(null);
        setRouterSaved(true);
        markStepCompleted(3);
        const newRouterId = data.router?.id || editingRouter?.id;
        if (newRouterId) {
          setSavedRouterId(newRouterId);
        }
        await loadRoutersList();
      } else {
        showError(data.error || 'Gagal menyimpan router');
      }
    } catch (error: any) {
      showError(error.message || 'Gagal menyimpan router');
    } finally {
      setSavingRouterItem(false);
    }
  };

  const handleDeleteRouterItem = async (id: string, name: string) => {
    const confirmed = await showConfirm(`Hapus router "${name}" dari sistem EugineBill?`, 'Hapus Router?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/network/routers?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        showSuccess('Router berhasil dihapus.');
        loadRoutersList();
      } else {
        showError('Gagal menghapus router');
      }
    } catch {
      showError('Gagal menghapus router');
    }
  };

  const handleSetupRadius = async (routerId: string) => {
    setSettingUpRadiusId(routerId);
    try {
      const response = await fetch(`/api/network/routers/${routerId}/setup-radius`, { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        setRadiusScriptModalData({
          script: result.script,
          scriptRos6: result.scriptRos6,
          scriptRos7: result.scriptRos7,
          config: result.config,
        });
        setRadiusScriptRosTab(7);
        setShowRadiusScriptModal(true);
      } else {
        showError(result.error + (result.details ? '\n' + result.details : ''));
      }
    } catch (error) {
      console.error('Setup RADIUS error:', error);
      showError('Gagal membuat script RADIUS');
    } finally {
      setSettingUpRadiusId(null);
    }
  };

  const handleSetupHotspot = async (routerData: Router, customParams?: any) => {
    setSettingUpHotspotId(routerData.id);
    const payload = customParams || hotspotForm;
    try {
      const response = await fetch(`/api/network/routers/${routerData.id}/setup-hotspot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        setHotspotModalData({
          router: routerData,
          script: result.script,
          scriptRos6: result.scriptRos6,
          scriptRos7: result.scriptRos7,
          config: result.config,
        });
        setHotspotRosTab(7);
        setShowHotspotSetupModal(true);
      } else {
        showError(result.error + (result.details ? '\n' + result.details : ''));
      }
    } catch (error) {
      console.error('Setup Hotspot error:', error);
      showError('Gagal generate script Hotspot');
    } finally {
      setSettingUpHotspotId(null);
    }
  };

  const handleApplyHotspotDirect = async () => {
    if (!hotspotModalData) return;
    setApplyingHotspot(true);
    try {
      const response = await fetch(`/api/network/routers/${hotspotModalData.router.id}/setup-hotspot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...hotspotForm, applyToRouter: true }),
      });
      const result = await response.json();
      if (result.applied) {
        showSuccess(`Konfigurasi Hotspot berhasil diterapkan ke router ${hotspotModalData.router.name}!`);
        setShowHotspotSetupModal(false);
      } else {
        showError(`Gagal menerapkan ke MikroTik: ${result.applyError || 'Koneksi API ditolak'}`);
      }
    } catch (error: any) {
      showError('Gagal menerapkan konfigurasi: ' + error.message);
    } finally {
      setApplyingHotspot(false);
    }
  };

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

  const handlePushIsolationToRouter = async () => {
    const targetRouterId = savedRouterId || (routersList.length > 0 ? routersList[0].id : null);
    if (!targetRouterId) {
      showError('Belum ada router yang dipilih atau terdaftar di sistem. Harap tambahkan router pada Langkah 3.');
      return;
    }

    setPushingIsolation(true);
    setIsolationPushResult(null);
    try {
      const res = await fetch('/api/settings/isolation/push-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerId: targetRouterId,
          settings: isolationForm,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsolationPushResult(data);
        showSuccess(data.message || 'Sistem isolasi berhasil dipasang otomatis ke router!');
        // Auto verify status
        await handleVerifyIsolationOnRouter();
      } else {
        showError(data.error || 'Gagal memasang konfigurasi isolasi ke router.');
      }
    } catch (err: any) {
      showError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setPushingIsolation(false);
    }
  };

  const handleVerifyIsolationOnRouter = async () => {
    const targetRouterId = savedRouterId || (routersList.length > 0 ? routersList[0].id : null);
    if (!targetRouterId) {
      showError('Belum ada router yang dipilih atau terdaftar di sistem.');
      return;
    }

    setVerifyingIsolation(true);
    try {
      const res = await fetch('/api/settings/isolation/verify-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId: targetRouterId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsolationVerificationResult(data.data);
        if (data.data.isFullyConfigured) {
          showSuccess(`Verifikasi berhasil! Seluruh aturan isolasi telah aktif di router ${data.data.routerName}.`);
        } else {
          showError(`Status isolir diperbarui. Beberapa aturan belum terpasang di router ${data.data.routerName}. Klik "Pasang Otomatis ke Router" untuk melengkapi.`);
        }
      } else {
        showError(data.error || 'Gagal memverifikasi router.');
      }
    } catch (err: any) {
      showError(err.message || 'Gagal memverifikasi status router.');
    } finally {
      setVerifyingIsolation(false);
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
      showSuccess(`Paket PPPoE '${profileForm.name}' berhasil disimpan dan disinkronkan ke router!`);
      markStepCompleted(5);
      setCurrentStep(6);
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan paket');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Step 6: Save Customer
  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);
    try {
      const resolvedProfileId = createdProfile?.id;
      const resolvedProfileName = createdProfile?.name || profileForm.name;

      const res = await fetch('/api/pppoe/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone,
          username: customerForm.username,
          password: customerForm.password,
          profileId: resolvedProfileId,
          profileName: resolvedProfileName,
          routerId: savedRouterId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Gagal membuat akun pelanggan');
      }

      setCreatedCustomer(data.user || data);
      showSuccess(`Akun pelanggan trial '${customerForm.username}' berhasil dibuat!`);
      markStepCompleted(6);
      setCurrentStep(7);
    } catch (err: any) {
      showError(err.message || 'Gagal membuat pelanggan');
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
      const res = await fetch('/api/admin/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: techForm.name,
          username: techForm.username,
          password: techForm.password,
          phoneNumber: techForm.phone,
          isActive: true,
          requireOtp: false,
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
  if (checkingInit || (isInitialized && sessionStatus === 'loading')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memeriksa status konfigurasi EugineBill...</p>
      </div>
    );
  }

  // Redirecting to Login for Unauthenticated Users
  if (isInitialized && sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Mengarahkan ke halaman login admin...</p>
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
              <div className="space-y-6">
                <Card className="border-border shadow-xs bg-card">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Cable className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle>Client VPN Setup (MikroTik Tunnel)</CardTitle>
                          <CardDescription>
                            Hubungkan router MikroTik ke VPS EugineBill via WireGuard atau L2TP VPN tunnel untuk bypass NAT ISP & remote akses.
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setVpnFormData({
                            name: '',
                            description: '',
                            vpnServerId: '__vps_wg__',
                            vpnType: 'wireguard',
                            customVpnIp: '',
                            localNetworks: '',
                            targetWinboxPort: '8291',
                            targetApiPort: '8728',
                            targetWwwPort: '80',
                          });
                          setShowAddVpnModal(true);
                        }}
                        className="bg-[#002C60] hover:bg-[#1b437c] text-white text-xs gap-1.5 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah VPN Client</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Client</p>
                          <p className="text-xl font-bold text-foreground">{vpnClientsList.length}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">RADIUS Server</p>
                          <p className="text-xl font-bold text-primary">{vpnClientsList.filter((c) => c.isRadiusServer).length}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Radio className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Client Aktif</p>
                          <p className="text-xl font-bold text-emerald-600">{vpnClientsList.filter((c) => c.isActive).length}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Wifi className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Architecture Callout */}
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Arsitektur VPN EugineBill & Panduan Konsentrator
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        VPS EugineBill bertindak sebagai <strong className="text-foreground">VPN Server</strong>. Alokasi <strong className="text-foreground">IP Client Tunnel</strong> digunakan VPS untuk meremote MikroTik menembus NAT ISP. Tambahkan Client VPN terlebih dahulu, lalu <strong className="text-foreground">Salin Skrip</strong> yang di-generate dan <strong className="text-foreground">Paste di Terminal Winbox</strong> MikroTik Anda.
                      </p>
                    </div>

                    {/* VPN Clients List */}
                    {vpnLoading ? (
                      <div className="p-10 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Memuat data VPN Client...</p>
                      </div>
                    ) : vpnClientsList.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border bg-muted/10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          <Cable className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 max-w-sm mx-auto">
                          <h4 className="text-sm font-bold text-foreground">Belum Ada VPN Client</h4>
                          <p className="text-xs text-muted-foreground">
                            Tambahkan client VPN untuk MikroTik Anda agar dapat terhubung dengan billing VPS EugineBill.
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setVpnFormData({
                              name: '',
                              description: '',
                              vpnServerId: '__vps_wg__',
                              vpnType: 'wireguard',
                              customVpnIp: '',
                              localNetworks: '',
                              targetWinboxPort: '8291',
                              targetApiPort: '8728',
                              targetWwwPort: '80',
                            });
                            setShowAddVpnModal(true);
                          }}
                          className="bg-[#002C60] hover:bg-[#1b437c] text-white text-xs gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Tambah Client VPN Pertama</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {vpnClientsList.map((client) => {
                          const serverInfo = resolveServer(client.vpnServerId);
                          return (
                            <div
                              key={client.id}
                              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Cable className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-sm text-foreground">{client.name}</h4>
                                      {client.isRadiusServer && (
                                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                          RADIUS Server
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                                        {client.vpnType || 'wireguard'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Server: {serverInfo?.name || client.vpnServerId || 'VPS Native'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => viewCredentials(client)}
                                    className="text-xs gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Script & Kredensial</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteVpnClient(client.id, client.name)}
                                    className="text-xs h-8 px-2.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Server VPN</span>
                                  <span className="font-mono text-foreground font-semibold">
                                    {serverInfo?.name || 'VPS VPN Server'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">IP VPN</span>
                                  {editingIpClientId === client.id ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <input
                                        type="text"
                                        value={editingIpValue}
                                        onChange={(e) => setEditingIpValue(e.target.value)}
                                        className="px-2 py-0.5 text-xs font-mono bg-background border border-primary rounded text-foreground w-28"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleEditIpSave(client.id)}
                                        disabled={editingIpLoading}
                                        className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-300"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setEditingIpClientId(null)}
                                        className="p-1 bg-red-50 text-red-600 rounded border border-red-300"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <code className="font-mono text-primary font-bold">{client.vpnIp}</code>
                                      <button
                                        onClick={() => {
                                          setEditingIpClientId(client.id);
                                          setEditingIpValue(client.vpnIp);
                                        }}
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Ubah IP VPN"
                                      >
                                        <Key className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Username</span>
                                  <span className="font-mono text-foreground font-semibold">{client.username}</span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Winbox Remote</span>
                                  <span className="font-mono text-foreground">
                                    {serverInfo?.host}:{client.winboxPort || client.publicPorts?.services?.winbox?.public || 8291}
                                  </span>
                                </div>
                              </div>

                              {client.description && (
                                <p className="text-xs text-muted-foreground">{client.description}</p>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                  <input
                                    type="checkbox"
                                    checked={client.isRadiusServer || false}
                                    onChange={(e) => handleToggleRadiusServer(client.id, e.target.checked)}
                                    className="rounded border-border text-primary"
                                  />
                                  <span className="text-muted-foreground">Jadikan sebagai RADIUS Server</span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
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

                {/* Modal 1: Add VPN Client Modal */}
                {showAddVpnModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Cable className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-base text-foreground">Tambah Client VPN</h3>
                        </div>
                        <button onClick={() => setShowAddVpnModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateVpnClient} className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="space-y-1.5">
                          <Label>Server VPN *</Label>
                          <select
                            value={vpnFormData.vpnServerId}
                            onChange={(e) => setVpnFormData({ ...vpnFormData, vpnServerId: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none"
                            required
                          >
                            <option value="">Pilih Server VPN</option>
                            {vpnFormData.vpnType === 'wireguard' && wgServerInfo?.installed && (
                              <option value="__vps_wg__">
                                [VPS Native] WireGuard Server ({wgServerInfo.publicIp || 'VPS'}:{wgServerInfo.listenPort || 51820}) — Rekomendasi Utama
                              </option>
                            )}
                            {vpnFormData.vpnType === 'l2tp' && l2tpServerInfo?.installed && (
                              <option value="__vps_l2tp__">
                                [VPS Native] L2TP/IPsec Server ({l2tpServerInfo.publicIp || 'VPS'}) — Rekomendasi Utama
                              </option>
                            )}
                            {vpnServersList
                              .filter((server) => {
                                if (vpnFormData.vpnType === 'wireguard') return server.wgEnabled === true;
                                if (vpnFormData.vpnType === 'l2tp') return server.l2tpEnabled === true;
                                if (vpnFormData.vpnType === 'sstp') return server.sstpEnabled === true;
                                if (vpnFormData.vpnType === 'pptp') return server.pptpEnabled === true;
                                return true;
                              })
                              .map((server) => (
                                <option key={server.id} value={server.id}>
                                  [External CHR] {server.name} ({server.host})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>VPN Protocol *</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['wireguard', 'l2tp', 'pptp', 'sstp'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setVpnFormData({
                                    ...vpnFormData,
                                    vpnType: type,
                                    vpnServerId: type === 'wireguard' ? '__vps_wg__' : type === 'l2tp' ? '__vps_l2tp__' : '',
                                  });
                                  if (type === 'wireguard') loadWgServerInfo();
                                  if (type === 'l2tp') loadL2tpServerInfo();
                                }}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                  vpnFormData.vpnType === type
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                                }`}
                              >
                                {type === 'l2tp' ? 'L2TP/IPSec' : type === 'wireguard' ? 'WireGuard' : type.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Nama Client *</Label>
                          <Input
                            value={vpnFormData.name}
                            onChange={(e) => setVpnFormData({ ...vpnFormData, name: e.target.value })}
                            placeholder="e.g., MIKROTIK SITE CIBINONG"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Deskripsi (opsional)</Label>
                          <Input
                            value={vpnFormData.description}
                            onChange={(e) => setVpnFormData({ ...vpnFormData, description: e.target.value })}
                            placeholder="Catatan tambahan..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>IP Lokal / Subnet di Balik NAS (AllowedIPs) (opsional)</Label>
                          <Input
                            value={vpnFormData.localNetworks}
                            onChange={(e) => setVpnFormData({ ...vpnFormData, localNetworks: e.target.value })}
                            placeholder="cth: 192.168.21.0/24, 192.168.1.0/24"
                            className="font-mono text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Pisahkan dengan koma. IP/subnet ini akan ditambahkan ke AllowedIPs peer di VPS agar VPS bisa menjangkau jaringan lokal / remote ONT di balik MikroTik.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label>IP VPN Client (opsional — kosongkan untuk auto-assign)</Label>
                          <Input
                            value={vpnFormData.customVpnIp}
                            onChange={(e) => setVpnFormData({ ...vpnFormData, customVpnIp: e.target.value })}
                            placeholder="cth: 10.200.0.2 (kosong = otomatis)"
                            className="font-mono text-xs"
                          />
                        </div>

                        <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3">
                          <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                            Port Layanan MikroTik (Target Port MikroTik)
                          </Label>
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground font-medium block">Winbox Port</span>
                              <Input
                                value={vpnFormData.targetWinboxPort}
                                onChange={(e) => setVpnFormData({ ...vpnFormData, targetWinboxPort: e.target.value })}
                                placeholder="8291"
                                className="font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground font-medium block">API Port</span>
                              <Input
                                value={vpnFormData.targetApiPort}
                                onChange={(e) => setVpnFormData({ ...vpnFormData, targetApiPort: e.target.value })}
                                placeholder="8728"
                                className="font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground font-medium block">WWW Port</span>
                              <Input
                                value={vpnFormData.targetWwwPort}
                                onChange={(e) => setVpnFormData({ ...vpnFormData, targetWwwPort: e.target.value })}
                                placeholder="80"
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Isi jika MikroTik Anda memakai port kustom (cth: Winbox 8228, API 8520). Port publik VPS akan otomatis di-forward (DNAT) ke port ini.
                          </p>
                        </div>

                        <div className="flex gap-3 pt-3">
                          <Button type="button" variant="outline" onClick={() => setShowAddVpnModal(false)} className="flex-1">
                            Batal
                          </Button>
                          <Button type="submit" disabled={creatingVpnClient} className="flex-1 bg-[#002C60] hover:bg-[#1b437c] text-white">
                            {creatingVpnClient ? 'Membuat...' : 'Buat Client VPN'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Modal 2: Credentials & Script Modal */}
                {showCredentialsModal && credentials && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-foreground">Kredensial &amp; Script Setup VPN MikroTik</h3>
                            <p className="text-xs text-muted-foreground">{credentials.nasName || credentials.username} ({credentials.vpnIp})</p>
                          </div>
                        </div>
                        <button onClick={() => setShowCredentialsModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/40 border border-border rounded-xl text-xs">
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">Server VPN</span>
                            <span className="font-mono text-foreground font-semibold">{credentials.server}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">IP VPN Client</span>
                            <span className="font-mono text-primary font-bold">{credentials.vpnIp}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">Username</span>
                            <span className="font-mono text-foreground font-semibold">{credentials.username}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">Password</span>
                            <span className="font-mono text-foreground font-semibold">{credentials.password || '-'}</span>
                          </div>
                          {credentials.apiUsername && (
                            <div>
                              <span className="text-muted-foreground block mb-0.5 font-medium">API &amp; Winbox User</span>
                              <span className="font-mono text-emerald-600 font-bold">{credentials.apiUsername}</span>
                            </div>
                          )}
                          {credentials.apiPassword && (
                            <div>
                              <span className="text-muted-foreground block mb-0.5 font-medium">API &amp; Winbox Pass</span>
                              <span className="font-mono text-emerald-600 font-bold">{credentials.apiPassword}</span>
                            </div>
                          )}
                        </div>

                        {/* Public Remote Access Ports Box */}
                        {(() => {
                          const vpsIp = credentials.vpsPublicIp || credentials.serverHost || credentials.server || 'VPS_IP';
                          const ports = credentials.publicPorts?.services || {};
                          const winboxPort = ports.winbox?.public || credentials.winboxPort || (credentials.vpnType === 'wireguard' ? 10001 : 8291);
                          const winboxTarget = ports.winbox?.target || 8291;
                          const apiPort = ports.api?.public || (credentials.vpnType === 'wireguard' ? 10002 : 8728);
                          const apiTarget = ports.api?.target || 8728;
                          const wwwPort = ports.www?.public || (credentials.vpnType === 'wireguard' ? 10004 : 80);
                          const wwwTarget = ports.www?.target || 80;
                          const sshPort = ports.ssh?.public || (credentials.vpnType === 'wireguard' ? 10006 : 22);
                          const sshTarget = ports.ssh?.target || 22;

                          return (
                            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  <Globe className="w-4 h-4 text-primary" /> Alokasi Remote Akses Publik (Dari Luar / Internet)
                                </p>
                                <span className="text-[11px] text-muted-foreground font-mono">Host: {vpsIp}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2.5 bg-card border border-border rounded-lg">
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Winbox Remote (&rarr; {winboxTarget})</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-xs font-bold text-primary truncate">{vpsIp}:{winboxPort}</span>
                                    <button onClick={() => copyToClipboard(`${vpsIp}:${winboxPort}`)} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-2.5 bg-card border border-border rounded-lg">
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">WebFig / Web (&rarr; {wwwTarget})</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-xs font-bold text-amber-600">Port {wwwPort}</span>
                                    <a href={`http://${vpsIp}:${wwwPort}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline shrink-0 ml-1 font-semibold">
                                      Buka &rarr;
                                    </a>
                                  </div>
                                </div>

                                <div className="p-2.5 bg-card border border-border rounded-lg">
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">API Port (&rarr; {apiTarget})</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-xs font-bold text-emerald-600">Port {apiPort}</span>
                                    <button onClick={() => copyToClipboard(String(apiPort))} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-2.5 bg-card border border-border rounded-lg">
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">SSH Port (&rarr; {sshTarget})</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-xs font-bold text-purple-600">Port {sshPort}</span>
                                    <button onClick={() => copyToClipboard(`${vpsIp} -p ${sshPort}`)} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Script MikroTik Terminal ({selectedVpnType.toUpperCase()})
                            </Label>
                            {selectedVpnType === 'l2tp' && (
                              <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setScriptMode('full')}
                                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                    scriptMode === 'full' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                                  }`}
                                >
                                  Lengkap (+Port & User)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScriptMode('quick')}
                                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                    scriptMode === 'quick' ? 'bg-background text-foreground font-bold shadow-xs' : 'text-muted-foreground'
                                  }`}
                                >
                                  Singkat (UltraVPN)
                                </button>
                              </div>
                            )}
                          </div>
                          <pre className="w-full font-mono text-xs p-4 rounded-xl border border-border bg-muted/60 text-foreground overflow-auto max-h-72 whitespace-pre-wrap break-words">
                            {generateMikroTikScript()}
                          </pre>
                        </div>
                      </div>

                      <div className="p-4 border-t border-border flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => copyToClipboard(generateMikroTikScript())}
                          className="flex-1 gap-1.5"
                        >
                          <Copy className="w-4 h-4 text-primary" />
                          <span>Salin Script RouterOS</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowCredentialsModal(false)}
                          className="flex-1 bg-[#002C60] hover:bg-[#1b437c] text-white"
                        >
                          Tutup
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: KONEKSI ROUTER MIKROTIK (API & CREDENTIALS) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Card className="border-border shadow-xs bg-card">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      <Button
                        onClick={() => {
                          setEditingRouter(null);
                          setRouterFormData({
                            name: 'Router Utama',
                            nasname: '',
                            shortname: '',
                            type: 'mikrotik',
                            ipAddress: '',
                            username: '',
                            password: '',
                            port: '8728',
                            apiPort: '8729',
                            winboxPort: '8291',
                            wwwPort: '80',
                            secret: 'secret123',
                            ports: '1812',
                            server: '',
                            community: '',
                            description: '',
                            vpnClientId: vpnClientsList[0]?.id || '',
                            authMode: 'local',
                          });
                          if (vpnClientsList.length > 0) {
                            handleVpnClientChange(vpnClientsList[0].id);
                          }
                          setRouterConnTestResult(null);
                          setShowRouterModal(true);
                        }}
                        className="bg-[#002C60] hover:bg-[#1b437c] text-white text-xs gap-1.5 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Router</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Router</p>
                          <p className="text-xl font-bold text-foreground">{routersList.length}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Server className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Online</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {Object.values(routerStatusMap).filter((s) => s.online).length}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Wifi className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">MikroTik</p>
                          <p className="text-xl font-bold text-primary">
                            {routersList.filter((r) => r.type === 'mikrotik').length}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Activity className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">via VPN</p>
                          <p className="text-xl font-bold text-purple-600">
                            {routersList.filter((r) => r.vpnClientId).length}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                          <Shield className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Router List */}
                    {loadingRouters ? (
                      <div className="p-10 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Memuat data router...</p>
                      </div>
                    ) : routersList.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-border bg-muted/10 space-y-6">
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                            <Server className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground">Tambah Router MikroTik Utama</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Isi detail koneksi API MikroTik Anda di bawah. Jika terhubung via VPN Client, kredensial dan IP akan otomatis terisi.
                          </p>
                        </div>

                        <form onSubmit={handleSaveRouterSubmit} className="space-y-4 max-w-xl mx-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="inlineRouterName">Nama Router *</Label>
                              <Input
                                id="inlineRouterName"
                                value={routerFormData.name}
                                onChange={(e) => setRouterFormData({ ...routerFormData, name: e.target.value })}
                                placeholder="Router Utama"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="inlineRouterType">Tipe Router *</Label>
                              <select
                                id="inlineRouterType"
                                value={routerFormData.type}
                                onChange={(e) => setRouterFormData({ ...routerFormData, type: e.target.value })}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none"
                                required
                              >
                                <option value="mikrotik">Router MikroTik</option>
                                <option value="gateway">Gateway VPS</option>
                                <option value="other">Lainnya</option>
                              </select>
                            </div>
                          </div>

                          {/* Auth Mode */}
                          <div className="space-y-2">
                            <Label>Mode Autentikasi Pelanggan *</Label>
                            <select
                              value={routerFormData.authMode || 'local'}
                              onChange={(e) => setRouterFormData({ ...routerFormData, authMode: e.target.value })}
                              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none"
                              required
                            >
                              <option value="local">Local MikroTik API (Default - Langsung RouterOS)</option>
                              <option value="radius">FreeRADIUS Server (Direct MySQL & CoA)</option>
                            </select>
                            <p className="text-[11px] text-muted-foreground">
                              {routerFormData.authMode === 'radius'
                                ? 'Autentikasi dikelola terpusat via server FreeRADIUS di MySQL radcheck/radreply.'
                                : 'Autentikasi dikelola langsung pada database internal MikroTik (/ppp/secret & /ip/hotspot/user).'}
                            </p>
                          </div>

                          {/* VPN Client Toggle */}
                          <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useVpnClientInRouter}
                                onChange={(e) => {
                                  setUseVpnClientInRouter(e.target.checked);
                                  if (!e.target.checked) setRouterFormData({ ...routerFormData, vpnClientId: '' });
                                }}
                                className="rounded border-border text-primary"
                              />
                              <div>
                                <span className="text-xs font-bold text-foreground">Hubungkan via VPN Client</span>
                                <p className="text-[11px] text-muted-foreground">Gunakan alamat IP VPN client yang ada</p>
                              </div>
                            </label>

                            {useVpnClientInRouter && (
                              <div className="pt-2">
                                <Label className="text-xs mb-1 block">VPN Client *</Label>
                                <select
                                  value={routerFormData.vpnClientId}
                                  onChange={(e) => handleVpnClientChange(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                                  required={useVpnClientInRouter}
                                >
                                  <option value="">Pilih VPN Client</option>
                                  {vpnClientsList.map((vpn) => (
                                    <option key={vpn.id} value={vpn.id}>
                                      {vpn.name} ({vpn.vpnIp}){vpn.isRadiusServer ? ' [RADIUS]' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* IP Addresses */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="inlineIp">Alamat IP (Untuk API) *</Label>
                              <Input
                                id="inlineIp"
                                value={routerFormData.ipAddress}
                                onChange={(e) => setRouterFormData({ ...routerFormData, ipAddress: e.target.value })}
                                placeholder="10.200.0.2"
                                required
                                disabled={useVpnClientInRouter && !!routerFormData.vpnClientId}
                              />
                              <p className="text-[11px] text-muted-foreground">Digunakan oleh VPS untuk meremote MikroTik via Winbox/API port.</p>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="inlineNas">NAS Name (IP) (Untuk RADIUS) *</Label>
                              <Input
                                id="inlineNas"
                                value={routerFormData.nasname}
                                onChange={(e) => setRouterFormData({ ...routerFormData, nasname: e.target.value })}
                                placeholder="10.200.0.2"
                                required
                                disabled={useVpnClientInRouter && !!routerFormData.vpnClientId}
                              />
                              <p className="text-[11px] text-muted-foreground">IP yang dikirim MikroTik ke RADIUS.</p>
                            </div>
                          </div>

                          {/* Ports */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="inlinePort">Port API</Label>
                              <Input
                                id="inlinePort"
                                type="number"
                                value={routerFormData.port}
                                onChange={(e) => setRouterFormData({ ...routerFormData, port: e.target.value })}
                                placeholder="8728"
                                className="font-mono text-xs"
                              />
                              <p className="text-[11px] text-muted-foreground">Port API MikroTik (default 8728)</p>
                              {!routerFormData.vpnClientId && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const port = routerFormData.port || '8728';
                                    const cmd = `/ip service set api port=${port} disabled=no address=""\n/ip firewall filter add chain=input action=accept protocol=tcp dst-port=${port},8728 comment="Allow EugineBill VPS API" place-before=0`;
                                    await copyToClipboard(cmd);
                                    showSuccess(`Script port ${port} & firewall disalin!`);
                                  }}
                                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono"
                                >
                                  <Copy className="w-3 h-3" /> Salin script port {routerFormData.port || '8728'} untuk MikroTik
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="inlineWinbox">Winbox Port</Label>
                              <Input
                                id="inlineWinbox"
                                type="number"
                                value={routerFormData.winboxPort}
                                onChange={(e) => setRouterFormData({ ...routerFormData, winboxPort: e.target.value })}
                                placeholder="8291"
                                className="font-mono text-xs"
                              />
                              <p className="text-[11px] text-muted-foreground">Port Winbox MikroTik (default 8291)</p>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="inlineWww">WWW Port (WebFig)</Label>
                              <Input
                                id="inlineWww"
                                type="number"
                                value={routerFormData.wwwPort}
                                onChange={(e) => setRouterFormData({ ...routerFormData, wwwPort: e.target.value })}
                                placeholder="80"
                                className="font-mono text-xs"
                              />
                              <p className="text-[11px] text-muted-foreground">Port WWW / Web (default 80)</p>
                            </div>
                          </div>

                          {/* Credentials */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="inlineUser">Username *</Label>
                              <Input
                                id="inlineUser"
                                value={routerFormData.username}
                                onChange={(e) => setRouterFormData({ ...routerFormData, username: e.target.value })}
                                placeholder="admin"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="inlinePass">Password *</Label>
                              <Input
                                id="inlinePass"
                                type="password"
                                value={routerFormData.password}
                                onChange={(e) => setRouterFormData({ ...routerFormData, password: e.target.value })}
                                placeholder="••••••••"
                                required
                              />
                            </div>
                          </div>

                          {/* RADIUS Secret */}
                          <div className="space-y-1.5">
                            <Label htmlFor="inlineSecret">RADIUS Secret *</Label>
                            <Input
                              id="inlineSecret"
                              value={routerFormData.secret}
                              onChange={(e) => setRouterFormData({ ...routerFormData, secret: e.target.value })}
                              placeholder="secret123"
                              required
                            />
                          </div>

                          {/* Test Connection Box */}
                          <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">Test Koneksi MikroTik</span>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleTestRouterConnection}
                                disabled={testingRouterConn}
                                className="text-xs gap-1.5"
                              >
                                {testingRouterConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-primary" />}
                                <span>{testingRouterConn ? 'Menguji...' : 'Tes Koneksi'}</span>
                              </Button>
                            </div>

                            {routerConnTestResult && (
                              <div
                                className={`p-3 rounded-lg text-xs ${
                                  routerConnTestResult.success
                                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                    : 'bg-red-50 text-red-900 border border-red-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {routerConnTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="font-semibold">{routerConnTestResult.message}</span>
                                </div>
                                {routerConnTestResult.identity && (
                                  <p className="mt-1 text-[11px] font-mono">Identitas: {routerConnTestResult.identity}</p>
                                )}
                              </div>
                            )}
                          </div>

                          <Button type="submit" disabled={savingRouterItem} className="w-full bg-[#002C60] hover:bg-[#1b437c] text-white gap-2">
                            {savingRouterItem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span>Simpan & Hubungkan Router</span>
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {routersList.map((routerData) => {
                          const status = routerStatusMap[routerData.id];
                          return (
                            <div
                              key={routerData.id}
                              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Server className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-sm text-foreground">{routerData.name}</h4>
                                      {status?.online ? (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                                          Online
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300">
                                          Offline
                                        </Badge>
                                      )}
                                      {routerData.vpnClient && (
                                        <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                          via VPN: {routerData.vpnClient.name}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-[10px]">
                                        {routerData.authMode === 'radius' ? 'FreeRADIUS' : 'Local API'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {routerData.type} • {routerData.nasname}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetupRadius(routerData.id)}
                                    disabled={settingUpRadiusId === routerData.id}
                                    className="text-xs gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
                                    title="Setup RADIUS Client"
                                  >
                                    <Radio className="w-3.5 h-3.5" />
                                    <span>RADIUS Script</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetupHotspot(routerData)}
                                    disabled={settingUpHotspotId === routerData.id}
                                    className="text-xs gap-1.5 h-8 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50"
                                    title="Setup Hotspot Gateway & VLAN"
                                  >
                                    <Wifi className="w-3.5 h-3.5" />
                                    <span>Hotspot</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingRouter(routerData);
                                      const winboxTarget = (routerData.vpnClient as any)?.publicPorts?.services?.winbox?.target?.toString() || '8291';
                                      const apiTarget = (routerData.vpnClient as any)?.publicPorts?.services?.api?.target?.toString();
                                      const wwwTarget = (routerData.vpnClient as any)?.publicPorts?.services?.www?.target?.toString() || '80';
                                      const effectivePort = routerData.port && routerData.port !== 8728 ? routerData.port.toString() : (apiTarget || routerData.port?.toString() || '8728');
                                      setRouterFormData({
                                        name: routerData.name,
                                        nasname: routerData.nasname,
                                        shortname: routerData.shortname,
                                        type: routerData.type,
                                        ipAddress: routerData.ipAddress,
                                        username: routerData.username,
                                        password: routerData.password,
                                        port: effectivePort,
                                        apiPort: routerData.apiPort ? routerData.apiPort.toString() : '8729',
                                        winboxPort: winboxTarget,
                                        wwwPort: wwwTarget,
                                        secret: routerData.secret,
                                        ports: routerData.ports?.toString() || '1812',
                                        server: routerData.server || '',
                                        community: routerData.community || '',
                                        description: routerData.description || '',
                                        vpnClientId: routerData.vpnClientId || '',
                                        authMode: routerData.authMode || 'local',
                                      });
                                      setUseVpnClientInRouter(!!routerData.vpnClientId);
                                      setShowRouterModal(true);
                                    }}
                                    className="text-xs h-8 px-2.5"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteRouterItem(routerData.id, routerData.name)}
                                    className="text-xs h-8 px-2.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">NAS Name (IP)</span>
                                  <div className="flex items-center gap-1">
                                    <code className="font-mono text-primary font-bold">{routerData.nasname}</code>
                                    <button
                                      onClick={() => copyToClipboard(routerData.nasname)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Short Name</span>
                                  <span className="font-mono text-foreground">{routerData.shortname || '-'}</span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Tipe</span>
                                  <span className="font-mono text-foreground">{routerData.type}</span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Port API</span>
                                  <span className="font-mono text-foreground font-bold">{routerData.port}</span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">Port RADIUS</span>
                                  <span className="font-mono text-foreground">{routerData.ports || 1812}</span>
                                </div>

                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium">RADIUS Secret</span>
                                  <div className="flex items-center gap-1">
                                    <code className="font-mono text-muted-foreground">{'*'.repeat(8)}</code>
                                    <button
                                      onClick={() => copyToClipboard(routerData.secret)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Status Info if present */}
                              {status && (status.identity || status.uptime) && (
                                <div className="p-3 bg-muted/40 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-border/60">
                                  {status.identity && (
                                    <div>
                                      <span className="text-muted-foreground block mb-0.5 font-medium">Identitas Router</span>
                                      <span className="font-mono text-emerald-700 font-bold">{status.identity}</span>
                                    </div>
                                  )}
                                  {status.uptime && (
                                    <div>
                                      <span className="text-muted-foreground block mb-0.5 font-medium">Uptime</span>
                                      <span className="font-mono text-foreground">{status.uptime}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {routerData.description && (
                                <p className="text-xs text-muted-foreground">{routerData.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="justify-between border-t border-border pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      Kembali
                    </Button>
                    <Button
                      onClick={() => {
                        markStepCompleted(3);
                        setCurrentStep(4);
                      }}
                      className="bg-[#002C60] hover:bg-[#1b437c] text-white"
                    >
                      <span>Lanjut ke Sistem Isolir</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>

                {/* Add / Edit Router Modal */}
                {showRouterModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Server className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-base text-foreground">
                            {editingRouter ? 'Edit Router' : 'Tambah Router Baru'}
                          </h3>
                        </div>
                        <button onClick={() => setShowRouterModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveRouterSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="space-y-1.5">
                          <Label>Nama Router *</Label>
                          <Input
                            value={routerFormData.name}
                            onChange={(e) => setRouterFormData({ ...routerFormData, name: e.target.value })}
                            placeholder="Router Utama"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Tipe Router *</Label>
                          <select
                            value={routerFormData.type}
                            onChange={(e) => setRouterFormData({ ...routerFormData, type: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none"
                            required
                          >
                            <option value="mikrotik">Router MikroTik</option>
                            <option value="gateway">Gateway VPS</option>
                            <option value="other">Lainnya</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Mode Autentikasi Pelanggan *</Label>
                          <select
                            value={routerFormData.authMode || 'local'}
                            onChange={(e) => setRouterFormData({ ...routerFormData, authMode: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none"
                            required
                          >
                            <option value="local">Local MikroTik API (Default - Langsung RouterOS)</option>
                            <option value="radius">FreeRADIUS Server (Direct MySQL & CoA)</option>
                          </select>
                          <p className="text-[11px] text-muted-foreground">
                            {routerFormData.authMode === 'radius'
                              ? 'Autentikasi dikelola terpusat via server FreeRADIUS di MySQL radcheck/radreply.'
                              : 'Autentikasi dikelola langsung pada database internal MikroTik (/ppp/secret & /ip/hotspot/user).'}
                          </p>
                        </div>

                        {/* VPN Client selector in modal */}
                        <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useVpnClientInRouter}
                              onChange={(e) => {
                                setUseVpnClientInRouter(e.target.checked);
                                if (!e.target.checked) setRouterFormData({ ...routerFormData, vpnClientId: '' });
                              }}
                              className="rounded border-border text-primary"
                            />
                            <div>
                              <span className="text-xs font-bold text-foreground">Hubungkan via VPN Client</span>
                              <p className="text-[11px] text-muted-foreground">Gunakan alamat IP VPN client yang ada</p>
                            </div>
                          </label>

                          {useVpnClientInRouter && (
                            <div className="pt-2">
                              <Label className="text-xs mb-1 block">VPN Client *</Label>
                              <select
                                value={routerFormData.vpnClientId}
                                onChange={(e) => handleVpnClientChange(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                                required={useVpnClientInRouter}
                              >
                                <option value="">Pilih VPN Client</option>
                                {vpnClientsList.map((vpn) => (
                                  <option key={vpn.id} value={vpn.id}>
                                    {vpn.name} ({vpn.vpnIp}){vpn.isRadiusServer ? ' [RADIUS]' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Alamat IP (Untuk API) *</Label>
                            <Input
                              value={routerFormData.ipAddress}
                              onChange={(e) => setRouterFormData({ ...routerFormData, ipAddress: e.target.value })}
                              placeholder="10.200.0.2"
                              required
                              disabled={useVpnClientInRouter && !!routerFormData.vpnClientId}
                            />
                            <p className="text-[11px] text-muted-foreground">Digunakan oleh VPS untuk meremote MikroTik via Winbox/API port.</p>
                          </div>

                          <div className="space-y-1.5">
                            <Label>NAS Name (IP) (Untuk RADIUS) *</Label>
                            <Input
                              value={routerFormData.nasname}
                              onChange={(e) => setRouterFormData({ ...routerFormData, nasname: e.target.value })}
                              placeholder="10.200.0.2"
                              required
                              disabled={useVpnClientInRouter && !!routerFormData.vpnClientId}
                            />
                            <p className="text-[11px] text-muted-foreground">IP yang dikirim MikroTik ke RADIUS.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label>Port API</Label>
                            <Input
                              type="number"
                              value={routerFormData.port}
                              onChange={(e) => setRouterFormData({ ...routerFormData, port: e.target.value })}
                              placeholder="8728"
                            />
                            <p className="text-[11px] text-muted-foreground">Port API MikroTik (default 8728)</p>
                            {(!useVpnClientInRouter || !routerFormData.vpnClientId) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const port = routerFormData.port || '8728';
                                  const cmd = `/ip service set api port=${port} disabled=no address=""\n/ip firewall filter add chain=input action=accept protocol=tcp dst-port=${port},8728 comment="Allow EugineBill VPS API" place-before=0`;
                                  await copyToClipboard(cmd);
                                  showSuccess(`Script port ${port} & firewall disalin!`);
                                }}
                                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono"
                              >
                                <Copy className="w-3 h-3" /> Salin script port {routerFormData.port || '8728'} untuk MikroTik
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label>Winbox Port</Label>
                            <Input
                              type="number"
                              value={routerFormData.winboxPort}
                              onChange={(e) => setRouterFormData({ ...routerFormData, winboxPort: e.target.value })}
                              placeholder="8291"
                            />
                            <p className="text-[11px] text-muted-foreground">Port Winbox MikroTik (default 8291)</p>
                          </div>

                          <div className="space-y-1.5">
                            <Label>WWW Port (WebFig)</Label>
                            <Input
                              type="number"
                              value={routerFormData.wwwPort}
                              onChange={(e) => setRouterFormData({ ...routerFormData, wwwPort: e.target.value })}
                              placeholder="80"
                            />
                            <p className="text-[11px] text-muted-foreground">Port WebFig MikroTik (default 80)</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Username *</Label>
                            <Input
                              value={routerFormData.username}
                              onChange={(e) => setRouterFormData({ ...routerFormData, username: e.target.value })}
                              placeholder="admin"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Password *</Label>
                            <Input
                              type="password"
                              value={routerFormData.password}
                              onChange={(e) => setRouterFormData({ ...routerFormData, password: e.target.value })}
                              placeholder="••••••••"
                              required={!editingRouter}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>RADIUS Secret *</Label>
                          <Input
                            value={routerFormData.secret}
                            onChange={(e) => setRouterFormData({ ...routerFormData, secret: e.target.value })}
                            placeholder="secret123"
                            required
                          />
                        </div>

                        {/* Test Connection Box in Modal */}
                        {!editingRouter && (
                          <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">Test Koneksi</span>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleTestRouterConnection}
                                disabled={testingRouterConn}
                                className="text-xs gap-1.5"
                              >
                                {testingRouterConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-primary" />}
                                <span>{testingRouterConn ? 'Menguji...' : 'Tes'}</span>
                              </Button>
                            </div>

                            {routerConnTestResult && (
                              <div
                                className={`p-3 rounded-lg text-xs ${
                                  routerConnTestResult.success
                                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                    : 'bg-red-50 text-red-900 border border-red-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {routerConnTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="font-semibold">{routerConnTestResult.message}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3 pt-3">
                          <Button type="button" variant="outline" onClick={() => setShowRouterModal(false)} className="flex-1">
                            Batal
                          </Button>
                          <Button type="submit" disabled={savingRouterItem} className="flex-1 bg-[#002C60] hover:bg-[#1b437c] text-white">
                            {savingRouterItem ? 'Menyimpan...' : editingRouter ? 'Update Router' : 'Simpan Router'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Modal: RADIUS Setup Script */}
                {showRadiusScriptModal && radiusScriptModalData && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Radio className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-foreground">Script Setup RADIUS Client MikroTik</h3>
                            <p className="text-xs text-muted-foreground">Konfigurasi otomatis AAA RADIUS client &amp; incoming CoA di MikroTik</p>
                          </div>
                        </div>
                        <button onClick={() => setShowRadiusScriptModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pilih Versi RouterOS:
                          </span>
                          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setRadiusScriptRosTab(7)}
                              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                radiusScriptRosTab === 7 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                              }`}
                            >
                              RouterOS 7.x (Recommended)
                            </button>
                            <button
                              type="button"
                              onClick={() => setRadiusScriptRosTab(6)}
                              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                radiusScriptRosTab === 6 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                              }`}
                            >
                              RouterOS 6.x
                            </button>
                          </div>
                        </div>

                        <pre className="w-full font-mono text-xs p-4 rounded-xl border border-border bg-muted/60 text-foreground overflow-auto max-h-72 whitespace-pre-wrap break-words">
                          {radiusScriptRosTab === 6 && radiusScriptModalData.scriptRos6
                            ? radiusScriptModalData.scriptRos6
                            : (radiusScriptModalData.scriptRos7 || radiusScriptModalData.script)}
                        </pre>

                        <div className="p-3.5 bg-muted/30 border border-border rounded-xl text-xs space-y-1 text-muted-foreground">
                          <p className="font-semibold text-foreground">Cara Menggunakan:</p>
                          <p>1. Buka Winbox &gt; Terminal MikroTik.</p>
                          <p>2. Salin dan tempel skrip di atas ke Terminal lalu tekan Enter.</p>
                        </div>
                      </div>

                      <div className="p-4 border-t border-border flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const toCopy = radiusScriptRosTab === 6 && radiusScriptModalData.scriptRos6
                              ? radiusScriptModalData.scriptRos6
                              : (radiusScriptModalData.scriptRos7 || radiusScriptModalData.script);
                            copyToClipboard(toCopy);
                            showSuccess(`Script RADIUS ROS ${radiusScriptRosTab}.x disalin!`);
                          }}
                          className="flex-1 gap-1.5"
                        >
                          <Copy className="w-4 h-4 text-primary" />
                          <span>Salin Script (ROS {radiusScriptRosTab})</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowRadiusScriptModal(false)}
                          className="flex-1 bg-[#002C60] hover:bg-[#1b437c] text-white"
                        >
                          Tutup
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal: Setup Hotspot Gateway & VLAN */}
                {showHotspotSetupModal && hotspotModalData && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Wifi className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-foreground">Setup Hotspot Gateway &amp; VLAN</h3>
                            <p className="text-xs text-muted-foreground">{hotspotModalData.router.name} ({hotspotModalData.router.nasname})</p>
                          </div>
                        </div>
                        <button onClick={() => setShowHotspotSetupModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {/* Parameters Form */}
                        <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
                          <p className="text-xs font-semibold text-foreground">Parameter Hotspot (Standard Identik)</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="space-y-1">
                              <Label className="text-[11px]">VLAN ID</Label>
                              <Input
                                type="number"
                                value={hotspotForm.vlanId}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, vlanId: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Parent Interface</Label>
                              <Input
                                value={hotspotForm.parentInterface}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, parentInterface: e.target.value })}
                                placeholder="bridge-LAN"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">DNS Name (Captive)</Label>
                              <Input
                                value={hotspotForm.dnsName}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, dnsName: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Gateway IP</Label>
                              <Input
                                value={hotspotForm.hotspotAddress}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, hotspotAddress: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Subnet</Label>
                              <Input
                                value={hotspotForm.hotspotSubnet}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, hotspotSubnet: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Pool Range</Label>
                              <Input
                                value={hotspotForm.poolRange}
                                onChange={(e) => setHotspotForm({ ...hotspotForm, poolRange: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetupHotspot(hotspotModalData.router, hotspotForm)}
                              disabled={settingUpHotspotId === hotspotModalData.router.id}
                              className="text-xs h-7 gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${settingUpHotspotId === hotspotModalData.router.id ? 'animate-spin' : ''}`} />
                              <span>Perbarui Script</span>
                            </Button>
                          </div>
                        </div>

                        {/* Version Tabs */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pilih Versi RouterOS:
                          </span>
                          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setHotspotRosTab(7)}
                              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                hotspotRosTab === 7 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                              }`}
                            >
                              RouterOS 7.x (Recommended)
                            </button>
                            <button
                              type="button"
                              onClick={() => setHotspotRosTab(6)}
                              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                hotspotRosTab === 6 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                              }`}
                            >
                              RouterOS 6.x
                            </button>
                          </div>
                        </div>

                        {/* Script Output */}
                        <pre className="w-full font-mono text-xs p-4 rounded-xl border border-border bg-muted/60 text-foreground overflow-auto max-h-56 whitespace-pre-wrap break-words">
                          {hotspotRosTab === 6 && hotspotModalData.scriptRos6
                            ? hotspotModalData.scriptRos6
                            : (hotspotModalData.scriptRos7 || hotspotModalData.script)}
                        </pre>

                        {/* Walled Garden Info */}
                        <div className="p-3.5 bg-muted/20 border border-border rounded-xl text-xs space-y-2">
                          <div className="font-semibold text-foreground">Walled Garden Payment Gateway (Otomatis):</div>
                          <div className="flex flex-wrap gap-1.5">
                            {['*.midtrans.com', '*.xendit.co', '*.tripay.co.id', '*.duitku.com', '*.qrin.id'].map((d) => (
                              <Badge key={d} variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
                                {d}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Pelanggan yang belum login dapat membuka link pembayaran e-voucher dan scan QRIS secara instan tanpa terblokir captive portal.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border-t border-border flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const toCopy = hotspotRosTab === 6 && hotspotModalData.scriptRos6
                              ? hotspotModalData.scriptRos6
                              : (hotspotModalData.scriptRos7 || hotspotModalData.script);
                            copyToClipboard(toCopy);
                            showSuccess(`Script Hotspot ROS ${hotspotRosTab}.x disalin!`);
                          }}
                          className="flex-1 gap-1.5"
                        >
                          <Copy className="w-4 h-4 text-primary" />
                          <span>Salin Script (ROS {hotspotRosTab})</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={handleApplyHotspotDirect}
                          disabled={applyingHotspot}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          {applyingHotspot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>{applyingHotspot ? 'Menerapkan ke Router...' : 'Terapkan Otomatis via API'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowHotspotSetupModal(false)}
                        >
                          Tutup
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: SISTEM ISOLIR */}
            {currentStep === 4 && (
              <Card className="border-border shadow-xs bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Pengaturan Sistem Isolasi Pelanggan</CardTitle>
                        <CardDescription>
                          Otomasi isolir tunggakan, IP pool isolir, rate limit, dan whitelist payment gateway.
                        </CardDescription>
                      </div>
                    </div>

                    {/* Quick router badge */}
                    {savedRouterId && (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 gap-1.5 hidden sm:flex">
                        <Server className="w-3.5 h-3.5" />
                        <span>Router Terhubung</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* General Isolation Settings Form */}
                  <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      1. Parameter Jaringan & Auto Isolasi
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

                  {/* Section 2: 1-Click Push & Live Verification */}
                  <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          2. Pemasangan Otomatis & Uji Status Router
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Terapkan seluruh aturan isolir (Pool, Profile, Whitelist, NAT Redirect, Filter) ke MikroTik via API.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleVerifyIsolationOnRouter}
                          disabled={verifyingIsolation || pushingIsolation}
                          className="text-xs gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          {verifyingIsolation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-primary" />}
                          <span>{verifyingIsolation ? 'Memeriksa...' : 'Uji Status Isolir'}</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handlePushIsolationToRouter}
                          disabled={pushingIsolation || verifyingIsolation}
                          className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {pushingIsolation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{pushingIsolation ? 'Memasang ke Router...' : 'Pasang Otomatis ke Router'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Verification Diagnostic Results */}
                    {isolationVerificationResult && (
                      <div className="space-y-3 pt-1">
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                            isolationVerificationResult.isFullyConfigured
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isolationVerificationResult.isFullyConfigured ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            )}
                            <div>
                              <p className="font-bold text-xs">
                                {isolationVerificationResult.isFullyConfigured
                                  ? `Sistem Isolasi Lengkap & Aktif di ${isolationVerificationResult.routerName}`
                                  : `Status Sistem Isolasi pada ${isolationVerificationResult.routerName}`}
                              </p>
                              <p className="text-[11px] opacity-90 mt-0.5">
                                {isolationVerificationResult.isFullyConfigured
                                  ? 'Seluruh aturan pool, profile, whitelist payment gateway, filter drop, dan NAT redirect sudah terpasang rapi.'
                                  : 'Beberapa aturan belum lengkap. Klik "Pasang Otomatis ke Router" untuk menginstal seluruh aturan sekaligus.'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold shrink-0 ${
                              isolationVerificationResult.isFullyConfigured
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                                : 'bg-amber-100 text-amber-800 border-amber-400'
                            }`}
                          >
                            {isolationVerificationResult.isFullyConfigured ? '100% Terpasang' : 'Perlu Dilengkapi'}
                          </Badge>
                        </div>

                        {/* Checklist Items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {isolationVerificationResult.items?.map((item: any) => (
                            <div
                              key={item.key}
                              className="p-3 bg-card rounded-lg border border-border flex items-start gap-2.5"
                            >
                              {item.status === 'ok' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : item.status === 'warning' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-foreground text-xs">{item.label}</span>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[9px] uppercase font-mono px-1.5 py-0 ${
                                      item.status === 'ok'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.status === 'warning'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {item.status === 'ok' ? 'OK' : item.status === 'warning' ? 'Warning' : 'Missing'}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Integrated RouterOS Script Generator */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                        3. Skrip Manual RouterOS MikroTik (Opsional)
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
                          Skrip MikroTik dengan Prefix Komentar Standar (EugineBill - ...)
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fullScript = `# ==============================================================================
# EUGINEBILL RADIUS - MIKROTIK ISOLATION SYSTEM SETUP
# Mode: ${isolationAuthMode.toUpperCase()} Mode
# Target OS: RouterOS ${isolationRosVersion.toUpperCase()}
# IP Billing Server: ${isolationForm.isolationServerIp}
# ==============================================================================

# 1. IP POOL ISOLIR
/ip pool
add name=pool-isolir ranges=192.168.200.100-192.168.200.200 comment="EugineBill - IP Pool untuk user yang diisolir"

# 2. PPP PROFILE ISOLIR
/ppp profile
add name=isolir \\
    local-address=192.168.200.1 \\
    remote-address=pool-isolir \\
    address-list=isolir \\
    rate-limit=${isolationForm.isolationRateLimit} \\
    use-mpls=no use-compression=no use-encryption=no \\
    comment="EugineBill - Profile untuk user yang diisolir"

# 3. FIREWALL ADDRESS LIST - PAYMENT GATEWAYS
/ip firewall address-list
add list=payment-gateways address=api.midtrans.com comment="EugineBill - Midtrans API"
add list=payment-gateways address=app.midtrans.com comment="EugineBill - Midtrans Snap"
add list=payment-gateways address=api.xendit.co comment="EugineBill - Xendit API"
add list=payment-gateways address=checkout.xendit.co comment="EugineBill - Xendit Checkout"
add list=payment-gateways address=passport.duitku.com comment="EugineBill - Duitku API"
add list=payment-gateways address=tripay.co.id comment="EugineBill - Tripay"
add list=payment-gateways address=qrin.web.id comment="EugineBill - QRIN Web Gateway"
add list=payment-gateways address=api.qrin.web.id comment="EugineBill - QRIN API Gateway"
add list=payment-gateways address=api.dana.id comment="EugineBill - DANA API"
add list=payment-gateways address=gopay.co.id comment="EugineBill - GoPay"
add list=payment-gateways address=qris.id comment="EugineBill - QRIS Hub"

# 4. FIREWALL FILTER - ISOLIR RULES
/ip firewall filter
add chain=forward src-address-list=isolir connection-state=established,related action=accept comment="EugineBill - Allow established/related isolir"
add chain=forward dst-address-list=isolir connection-state=established,related action=accept comment="EugineBill - Allow return traffic isolir"
add chain=forward src-address-list=isolir protocol=udp dst-port=53 action=accept comment="EugineBill - Allow DNS isolir"
add chain=forward src-address-list=isolir protocol=tcp dst-port=53 action=accept comment="EugineBill - Allow DNS TCP isolir"
add chain=forward src-address-list=isolir protocol=icmp action=accept comment="EugineBill - Allow ping isolir"
add chain=forward src-address-list=isolir dst-address=${isolationForm.isolationServerIp} action=accept comment="EugineBill - Allow billing server access"
add chain=forward src-address-list=isolir dst-address-list=payment-gateways action=accept comment="EugineBill - Allow payment gateway access"
add chain=forward src-address-list=isolir action=drop comment="EugineBill - Drop other internet traffic for isolir"

# 5. FIREWALL NAT - REDIRECT TO BILLING SERVER
/ip firewall nat
add chain=dstnat src-address-list=isolir protocol=tcp dst-port=80 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=80 comment="EugineBill - Redirect HTTP to isolation landing page"
add chain=dstnat src-address-list=isolir protocol=tcp dst-port=443 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=443 comment="EugineBill - Redirect HTTPS to isolation landing page"
`;
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
                        rows={9}
                        value={`# ==============================================================================
# EUGINEBILL RADIUS - MIKROTIK ISOLATION SYSTEM SETUP
# Mode: ${isolationAuthMode.toUpperCase()} Mode
# Target OS: RouterOS ${isolationRosVersion.toUpperCase()}
# IP Billing Server: ${isolationForm.isolationServerIp}
# ==============================================================================

# 1. IP POOL ISOLIR
/ip pool
add name=pool-isolir ranges=192.168.200.100-192.168.200.200 comment="EugineBill - IP Pool untuk user yang diisolir"

# 2. PPP PROFILE ISOLIR
/ppp profile
add name=isolir \\
    local-address=192.168.200.1 \\
    remote-address=pool-isolir \\
    address-list=isolir \\
    rate-limit=${isolationForm.isolationRateLimit} \\
    use-mpls=no use-compression=no use-encryption=no \\
    comment="EugineBill - Profile untuk user yang diisolir"

# 3. FIREWALL ADDRESS LIST - PAYMENT GATEWAYS
/ip firewall address-list
add list=payment-gateways address=api.midtrans.com comment="EugineBill - Midtrans API"
add list=payment-gateways address=app.midtrans.com comment="EugineBill - Midtrans Snap"
add list=payment-gateways address=api.xendit.co comment="EugineBill - Xendit API"
add list=payment-gateways address=checkout.xendit.co comment="EugineBill - Xendit Checkout"
add list=payment-gateways address=passport.duitku.com comment="EugineBill - Duitku API"
add list=payment-gateways address=tripay.co.id comment="EugineBill - Tripay"
add list=payment-gateways address=qrin.web.id comment="EugineBill - QRIN Web Gateway"
add list=payment-gateways address=api.qrin.web.id comment="EugineBill - QRIN API Gateway"
add list=payment-gateways address=api.dana.id comment="EugineBill - DANA API"
add list=payment-gateways address=gopay.co.id comment="EugineBill - GoPay"
add list=payment-gateways address=qris.id comment="EugineBill - QRIS Hub"

# 4. FIREWALL FILTER - ISOLIR RULES
/ip firewall filter
add chain=forward src-address-list=isolir connection-state=established,related action=accept comment="EugineBill - Allow established/related isolir"
add chain=forward dst-address-list=isolir connection-state=established,related action=accept comment="EugineBill - Allow return traffic isolir"
add chain=forward src-address-list=isolir protocol=udp dst-port=53 action=accept comment="EugineBill - Allow DNS isolir"
add chain=forward src-address-list=isolir protocol=tcp dst-port=53 action=accept comment="EugineBill - Allow DNS TCP isolir"
add chain=forward src-address-list=isolir protocol=icmp action=accept comment="EugineBill - Allow ping isolir"
add chain=forward src-address-list=isolir dst-address=${isolationForm.isolationServerIp} action=accept comment="EugineBill - Allow billing server access"
add chain=forward src-address-list=isolir dst-address-list=payment-gateways action=accept comment="EugineBill - Allow payment gateway access"
add chain=forward src-address-list=isolir action=drop comment="EugineBill - Drop other internet traffic for isolir"

# 5. FIREWALL NAT - REDIRECT TO BILLING SERVER
/ip firewall nat
add chain=dstnat src-address-list=isolir protocol=tcp dst-port=80 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=80 comment="EugineBill - Redirect HTTP to isolation landing page"
add chain=dstnat src-address-list=isolir protocol=tcp dst-port=443 dst-address=!${isolationForm.isolationServerIp} dst-address-list=!payment-gateways action=dst-nat to-addresses=${isolationForm.isolationServerIp} to-ports=443 comment="EugineBill - Redirect HTTPS to isolation landing page"
`}
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

                  {radiusForm.radiusEnabled ? (
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
                  ) : (
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                      <Radio className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <div className="font-semibold text-foreground">Mode MikroTik Local (Direct API) Aktif</div>
                        <p className="text-muted-foreground leading-relaxed">
                          Pelanggan PPPoE dan Voucher Hotspot diautentikasi 100% langsung oleh router MikroTik melalui API lokal (<code className="bg-muted px-1 py-0.5 rounded text-foreground">/ppp/secret</code> dan <code className="bg-muted px-1 py-0.5 rounded text-foreground">/ip/hotspot/user</code>). Konfigurasi secret dan IP server FreeRADIUS tidak diperlukan.
                        </p>
                      </div>
                    </div>
                  )}
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
