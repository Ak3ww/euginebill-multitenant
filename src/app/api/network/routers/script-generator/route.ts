import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/network/routers/script-generator
 * Generates dynamic RouterOS setup scripts for MikroTik routers (WireGuard, L2TP, Direct IP)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      connectionMethod = 'wireguard',
      name = 'MikroTik-Utama',
      ipAddress = '10.254.1.2',
      nasname = '10.254.1.2',
      port = 8728,
      winboxPort = 8291,
      wwwPort = 80,
      username = 'api-mikrotik-admin',
      password = 'EB@ApiSecret2026',
      secret = 'secret123',
      authMode = 'local',
      publicIp = '43.173.14.236',
      allowedIps = '',
    } = body;

    const apiPort = parseInt(port) || 8728;
    const winboxPortInt = parseInt(winboxPort) || 8291;
    const vpsPublicIp = publicIp || process.env.VPS_IP || process.env.PUBLIC_IP || '43.173.14.236';

    // Generate keys for WireGuard if needed
    const clientPrivateKey = crypto.randomBytes(32).toString('base64');
    const serverPublicKey = 'EBvpsWgServerPublicKey4317314236KeyGen=';

    let script = `# ========================================================\n`;
    script += `# EUGINEBILL RADIUS - MIKROTIK ROUTER SETUP SCRIPT\n`;
    script += `# Target Router: ${name}\n`;
    script += `# Metode Koneksi: ${connectionMethod.toUpperCase()}\n`;
    script += `# VPS Public IP: ${vpsPublicIp}\n`;
    script += `# Router IP Target: ${ipAddress}\n`;
    script += `# API Port: ${apiPort} | Winbox Port: ${winboxPortInt}\n`;
    script += `# Mode Autentikasi: ${authMode === 'radius' ? 'FreeRADIUS Server Mode' : 'Local MikroTik API Mode'}\n`;
    script += `# Generated: ${new Date().toISOString()}\n`;
    script += `# ========================================================\n\n`;

    if (connectionMethod === 'wireguard') {
      script += `# --- 1. Konfigurasi WireGuard Client (Tunnel Aman ke VPS ${vpsPublicIp}) ---\n`;
      script += `:if ([:len [/interface wireguard find name="wg0-euginebill"]] = 0) do={\n`;
      script += `    /interface wireguard add listen-port=13231 name=wg0-euginebill comment="EugineBill WireGuard Tunnel"\n`;
      script += `}\n`;
      script += `:do { /interface wireguard peers remove [find comment~"EugineBill"] } on-error={}\n`;
      script += `/interface wireguard peers add interface=wg0-euginebill public-key="${serverPublicKey}" endpoint-address="${vpsPublicIp}" endpoint-port=51820 allowed-address=0.0.0.0/0 persistent-keepalive=25 comment="EugineBill VPS Tunnel Peer"\n`;
      script += `:if ([:len [/ip address find comment="EugineBill VPN IP"]] = 0) do={\n`;
      script += `    /ip address add address=${ipAddress}/24 interface=wg0-euginebill comment="EugineBill VPN IP"\n`;
      script += `}\n\n`;
    } else if (connectionMethod === 'l2tp') {
      script += `# --- 1. Konfigurasi L2TP Client VPN (UltraVPN Standard ke VPS ${vpsPublicIp}) ---\n`;
      script += `:if ([:len [/ppp profile find name="ebvpn-remote"]] = 0) do={\n`;
      script += `    /ppp profile add name=ebvpn-remote use-encryption=no change-tcp-mss=yes only-one=no comment="EugineBill VPN Profile"\n`;
      script += `}\n`;
      script += `:do { /interface l2tp-client remove [find comment~"EugineBill"] } on-error={}\n`;
      script += `/interface l2tp-client add name=l2tp-euginebill connect-to="${vpsPublicIp}" user="${username}" password="${password}" profile=ebvpn-remote use-ipsec=no allow=chap,mschap2 disabled=no add-default-route=no comment="EugineBill L2TP VPN"\n\n`;
    } else {
      script += `# --- 1. Konfigurasi Direct IP API (Tanpa VPN Tunnel) ---\n`;
      script += `# Router diakses secara langsung di IP LAN / IP Publik Static ${ipAddress}\n\n`;
    }

    script += `# --- 2. Buat Group Akses Khusus API & Winbox ---\n`;
    script += `:do { /user group add name=api-users policy=read,write,policy,test,sensitive,api,winbox,password,local,web,ssh comment="API Access EugineBill" } on-error={}\n`;
    script += `:do { /user group set [find name="api-users"] policy=read,write,policy,test,sensitive,api,winbox,password,local,web,ssh } on-error={}\n\n`;

    script += `# --- 3. Buat User API MikroTik (${username}) ---\n`;
    script += `:do { /user remove [find name="${username}"] } on-error={}\n`;
    script += `/user add name="${username}" group=api-users password="${password}" comment="API User EugineBill"\n\n`;

    script += `# --- 4. Aktifkan Service Port API & Winbox ---\n`;
    script += `:do { /ip service set api port=${apiPort} address="" disabled=no } on-error={}\n`;
    script += `:do { /ip service set winbox port=${winboxPortInt} address="" disabled=no } on-error={}\n\n`;

    script += `# --- 5. Buka Akses Firewall Filter di Posisi Teratas ---\n`;
    script += `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=${apiPort},8728 comment="Allow EugineBill VPS API" place-before=0 } on-error={}\n`;
    if (connectionMethod === 'wireguard') {
      script += `:do { /ip firewall filter add chain=input action=accept in-interface=wg0-euginebill place-before=0 comment="Allow EugineBill WG VPN" } on-error={}\n`;
    } else if (connectionMethod === 'l2tp') {
      script += `:do { /ip firewall filter add chain=input action=accept in-interface=l2tp-euginebill place-before=0 comment="Allow EugineBill L2TP VPN" } on-error={}\n`;
    }

    if (authMode === 'radius') {
      script += `\n# --- 6. Konfigurasi RADIUS Server Client (FreeRADIUS ${vpsPublicIp}) ---\n`;
      script += `:do { /radius remove [find comment~"EugineBill"] } on-error={}\n`;
      script += `/radius add service=ppp,hotspot address=${vpsPublicIp} secret="${secret}" src-address="${nasname}" timeout=3s comment="EugineBill FreeRADIUS"\n`;
      script += `/radius incoming set accept=yes port=3799\n`;
    }

    script += `\n# ========================================================\n`;
    script += `# SELESAI! Salin skrip di atas dan tempel di Terminal Winbox.\n`;
    script += `# ========================================================`;

    return NextResponse.json({
      success: true,
      script,
      vpsPublicIp,
      connectionMethod,
      authMode,
    });
  } catch (error: any) {
    console.error('Error generating script:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate script' }, { status: 500 });
  }
}
