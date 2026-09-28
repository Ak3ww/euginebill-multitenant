/**
 * MikroTik Isolation System Synchronization & Diagnostic Service — EugineBill
 *
 * Handles automated 1-click push, live verification, and cleanup of isolation rules on MikroTik routers.
 * Standardizes all rule comments with 'EugineBill - ' prefix for effortless auditing and cleanup.
 *
 * @module server/services/mikrotik/isolation-sync.service
 */

import { prisma } from '@/server/db/client';
import { PPPSecretService } from './ppp-secret.service';

const CMD_TIMEOUT = 12_000;

export interface IsolationSettingsInput {
  isolationEnabled?: boolean;
  isolationIpPool?: string;
  isolationServerIp?: string;
  isolationRateLimit?: string;
  isolationAllowDns?: boolean;
  isolationAllowPayment?: boolean;
}

export interface IsolationVerificationItem {
  key: string;
  label: string;
  status: 'ok' | 'missing' | 'warning' | 'error';
  message: string;
  detail?: any;
}

export interface IsolationVerificationResult {
  success: boolean;
  routerName: string;
  routerIp: string;
  isFullyConfigured: boolean;
  items: IsolationVerificationItem[];
  timestamp: string;
}

/**
 * Standard Whitelist of Payment Gateways and Essential Services
 */
export const PAYMENT_GATEWAY_WHITELIST = [
  // Midtrans / Snap
  { address: 'api.midtrans.com', comment: 'EugineBill - Midtrans API' },
  { address: 'app.midtrans.com', comment: 'EugineBill - Midtrans Snap' },
  { address: 'app.sandbox.midtrans.com', comment: 'EugineBill - Midtrans Sandbox' },
  { address: 'payment.midtrans.com', comment: 'EugineBill - Midtrans Payment' },
  { address: 'assets.midtrans.com', comment: 'EugineBill - Midtrans Assets' },

  // Xendit
  { address: 'api.xendit.co', comment: 'EugineBill - Xendit API' },
  { address: 'checkout.xendit.co', comment: 'EugineBill - Xendit Checkout' },
  { address: 'dashboard.xendit.co', comment: 'EugineBill - Xendit Dashboard' },
  { address: 'pay.xendit.co', comment: 'EugineBill - Xendit Pay' },

  // Duitku
  { address: 'passport.duitku.com', comment: 'EugineBill - Duitku API' },
  { address: 'merchant.duitku.com', comment: 'EugineBill - Duitku Merchant' },
  { address: 'sandbox.duitku.com', comment: 'EugineBill - Duitku Sandbox' },

  // Tripay & iPaymu
  { address: 'tripay.co.id', comment: 'EugineBill - Tripay' },
  { address: 'payment.tripay.co.id', comment: 'EugineBill - Tripay Payment' },
  { address: 'my.ipaymu.com', comment: 'EugineBill - iPaymu' },
  { address: 'payment.ipaymu.com', comment: 'EugineBill - iPaymu Payment' },

  // E-Wallet & Bank QRIS (QRIN, GoPay, DANA, OVO, ShopeePay)
  { address: 'qrin.web.id', comment: 'EugineBill - QRIN Web' },
  { address: 'api.qrin.web.id', comment: 'EugineBill - QRIN API' },
  { address: 'qrin.id', comment: 'EugineBill - QRIN Domain' },
  { address: 'api.gojek.com', comment: 'EugineBill - Gojek API' },
  { address: 'gopay.co.id', comment: 'EugineBill - GoPay' },
  { address: 'api.dana.id', comment: 'EugineBill - DANA API' },
  { address: 'checkout.dana.id', comment: 'EugineBill - DANA Checkout' },
  { address: 'api.ovo.id', comment: 'EugineBill - OVO API' },
  { address: 'open-api.airpay.co.id', comment: 'EugineBill - ShopeePay' },
  { address: 'qris.id', comment: 'EugineBill - QRIS Hub' },
];

export class IsolationSyncService {
  /**
   * Pushes the complete isolation configuration to a MikroTik router via RouterOS API.
   */
  static async pushIsolationToRouter(
    routerId: string,
    customSettings?: IsolationSettingsInput
  ): Promise<{ success: boolean; message: string; details: any }> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
      include: { vpnClient: true },
    });

    if (!router) {
      throw new Error(`Router dengan ID '${routerId}' tidak ditemukan.`);
    }

    const company = await prisma.company.findFirst();

    // Resolve isolation settings
    const poolCidr = customSettings?.isolationIpPool || company?.isolationIpPool || '192.168.200.0/24';
    const serverIp = customSettings?.isolationServerIp || company?.isolationServerIp || '43.173.14.236';
    const rateLimit = customSettings?.isolationRateLimit || company?.isolationRateLimit || '64k/64k';

    // Parse IP Pool start/end from CIDR
    const poolPrefix = poolCidr.split('/')[0].replace(/\.\d+$/, '');
    const poolRanges = `${poolPrefix}.100-${poolPrefix}.200`;
    const localGatewayIp = `${poolPrefix}.1`;

    const { conn } = await PPPSecretService.connectToRouter(router);

    const executedSteps: string[] = [];
    const errors: string[] = [];

    // 1. Setup /ip/pool (pool-isolir)
    try {
      const existingPools = await conn.execute('/ip/pool/print', ['?name=pool-isolir']);
      if (Array.isArray(existingPools) && existingPools.length > 0) {
        await conn.execute('/ip/pool/set', [
          `=.id=${existingPools[0]['.id']}`,
          `=ranges=${poolRanges}`,
          '=comment=EugineBill - IP Pool untuk user yang diisolir',
        ]);
        executedSteps.push(`Updated IP Pool 'pool-isolir' (${poolRanges})`);
      } else {
        await conn.execute('/ip/pool/add', [
          '=name=pool-isolir',
          `=ranges=${poolRanges}`,
          '=comment=EugineBill - IP Pool untuk user yang diisolir',
        ]);
        executedSteps.push(`Created IP Pool 'pool-isolir' (${poolRanges})`);
      }
    } catch (e: any) {
      errors.push(`IP Pool Error: ${e.message}`);
    }

    // 2. Setup /ppp/profile (isolir)
    try {
      const existingProfiles = await conn.execute('/ppp/profile/print', ['?name=isolir']);
      if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
        await conn.execute('/ppp/profile/set', [
          `=.id=${existingProfiles[0]['.id']}`,
          `=local-address=${localGatewayIp}`,
          '=remote-address=pool-isolir',
          '=address-list=isolir',
          `=rate-limit=${rateLimit}`,
          '=use-mpls=no',
          '=use-compression=no',
          '=use-encryption=no',
          '=comment=EugineBill - Profile untuk user yang diisolir',
        ]);
        executedSteps.push(`Updated PPP Profile 'isolir' (Gateway: ${localGatewayIp}, Rate: ${rateLimit})`);
      } else {
        await conn.execute('/ppp/profile/add', [
          '=name=isolir',
          `=local-address=${localGatewayIp}`,
          '=remote-address=pool-isolir',
          '=address-list=isolir',
          `=rate-limit=${rateLimit}`,
          '=use-mpls=no',
          '=use-compression=no',
          '=use-encryption=no',
          '=comment=EugineBill - Profile untuk user yang diisolir',
        ]);
        executedSteps.push(`Created PPP Profile 'isolir' (Gateway: ${localGatewayIp}, Rate: ${rateLimit})`);
      }
    } catch (e: any) {
      errors.push(`PPP Profile Error: ${e.message}`);
    }

    // 3. Setup /ip/firewall/address-list (payment-gateways)
    try {
      const existingEntries = await conn.execute('/ip/firewall/address-list/print', [
        '?list=payment-gateways',
      ]);
      const existingMap = new Set(
        Array.isArray(existingEntries) ? existingEntries.map((e: any) => e.address) : []
      );

      let addedCount = 0;
      for (const item of PAYMENT_GATEWAY_WHITELIST) {
        if (!existingMap.has(item.address)) {
          await conn.execute('/ip/firewall/address-list/add', [
            '=list=payment-gateways',
            `=address=${item.address}`,
            `=comment=${item.comment}`,
          ]);
          addedCount++;
        }
      }
      executedSteps.push(`Payment Gateways Whitelist: ${addedCount} added, total active.`);
    } catch (e: any) {
      errors.push(`Address-List Error: ${e.message}`);
    }

    // 4. Setup /ip/firewall/filter rules
    try {
      const existingFilters = await conn.execute('/ip/firewall/filter/print', [
        '?comment~^EugineBill',
      ]);
      const filterComments = new Set(
        Array.isArray(existingFilters) ? existingFilters.map((f: any) => f.comment) : []
      );

      // Rule 1: Established / Related forward
      if (!filterComments.has('EugineBill - Allow established/related isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=connection-state=established,related',
          '=action=accept',
          '=comment=EugineBill - Allow established/related isolir',
        ]);
      }
      if (!filterComments.has('EugineBill - Allow return traffic isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=dst-address-list=isolir',
          '=connection-state=established,related',
          '=action=accept',
          '=comment=EugineBill - Allow return traffic isolir',
        ]);
      }

      // Rule 2: Allow DNS
      if (!filterComments.has('EugineBill - Allow DNS isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=protocol=udp',
          '=dst-port=53',
          '=action=accept',
          '=comment=EugineBill - Allow DNS isolir',
        ]);
      }
      if (!filterComments.has('EugineBill - Allow DNS TCP isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=protocol=tcp',
          '=dst-port=53',
          '=action=accept',
          '=comment=EugineBill - Allow DNS TCP isolir',
        ]);
      }

      // Rule 3: Allow Ping (ICMP)
      if (!filterComments.has('EugineBill - Allow ping isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=protocol=icmp',
          '=action=accept',
          '=comment=EugineBill - Allow ping isolir',
        ]);
      }

      // Rule 4: Allow Akses ke Billing Server (Landing Page & Invoice)
      if (!filterComments.has('EugineBill - Allow billing server access')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          `=dst-address=${serverIp}`,
          '=action=accept',
          '=comment=EugineBill - Allow billing server access',
        ]);
      }

      // Rule 5: Allow Akses ke Payment Gateway
      if (!filterComments.has('EugineBill - Allow payment gateway access')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=dst-address-list=payment-gateways',
          '=action=accept',
          '=comment=EugineBill - Allow payment gateway access',
        ]);
      }

      // Rule 6: Drop Other Internet Traffic
      if (!filterComments.has('EugineBill - Drop other internet traffic for isolir')) {
        await conn.execute('/ip/firewall/filter/add', [
          '=chain=forward',
          '=src-address-list=isolir',
          '=action=drop',
          '=comment=EugineBill - Drop other internet traffic for isolir',
        ]);
      }

      executedSteps.push('Firewall Filter rules verified & installed');
    } catch (e: any) {
      errors.push(`Firewall Filter Error: ${e.message}`);
    }

    // 5. Setup /ip/firewall/nat rules (Redirect HTTP/HTTPS to Billing Server)
    try {
      const existingNat = await conn.execute('/ip/firewall/nat/print', [
        '?comment~^EugineBill',
      ]);
      const natComments = new Set(
        Array.isArray(existingNat) ? existingNat.map((n: any) => n.comment) : []
      );

      // NAT 1: Redirect HTTP Port 80
      if (!natComments.has('EugineBill - Redirect HTTP to isolation landing page')) {
        await conn.execute('/ip/firewall/nat/add', [
          '=chain=dstnat',
          '=src-address-list=isolir',
          '=protocol=tcp',
          '=dst-port=80',
          `=dst-address=!${serverIp}`,
          '=dst-address-list=!payment-gateways',
          '=action=dst-nat',
          `=to-addresses=${serverIp}`,
          '=to-ports=80',
          '=comment=EugineBill - Redirect HTTP to isolation landing page',
        ]);
      }

      // NAT 2: Redirect HTTPS Port 443
      if (!natComments.has('EugineBill - Redirect HTTPS to isolation landing page')) {
        await conn.execute('/ip/firewall/nat/add', [
          '=chain=dstnat',
          '=src-address-list=isolir',
          '=protocol=tcp',
          '=dst-port=443',
          `=dst-address=!${serverIp}`,
          '=dst-address-list=!payment-gateways',
          '=action=dst-nat',
          `=to-addresses=${serverIp}`,
          '=to-ports=443',
          '=comment=EugineBill - Redirect HTTPS to isolation landing page',
        ]);
      }

      executedSteps.push('Firewall NAT redirect rules verified & installed');
    } catch (e: any) {
      errors.push(`Firewall NAT Error: ${e.message}`);
    }

    const hasErrors = errors.length > 0;
    return {
      success: !hasErrors,
      message: hasErrors
        ? `Pemasangan isolir selesai dengan beberapa peringatan: ${errors.join(', ')}`
        : `Sistem isolasi berhasil dipasang otomatis pada router '${router.name}'!`,
      details: {
        router: router.name,
        executedSteps,
        errors,
      },
    };
  }

  /**
   * Verifies whether the isolation rules are installed and valid on a MikroTik router.
   */
  static async verifyIsolationOnRouter(routerId: string): Promise<IsolationVerificationResult> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
      include: { vpnClient: true },
    });

    if (!router) {
      throw new Error(`Router dengan ID '${routerId}' tidak ditemukan.`);
    }

    const items: IsolationVerificationItem[] = [];

    let conn: any;
    try {
      const connResult = await PPPSecretService.connectToRouter(router);
      conn = connResult.conn;
    } catch (connErr: any) {
      return {
        success: false,
        routerName: router.name,
        routerIp: router.ipAddress || router.nasname || 'Unknown',
        isFullyConfigured: false,
        items: [
          {
            key: 'connection',
            label: 'Koneksi MikroTik API',
            status: 'error',
            message: `Gagal terhubung ke router: ${connErr.message}`,
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Verify /ip/pool (pool-isolir)
    try {
      const pools = await conn.execute('/ip/pool/print', ['?name=pool-isolir']);
      if (Array.isArray(pools) && pools.length > 0) {
        items.push({
          key: 'pool',
          label: "IP Pool 'pool-isolir'",
          status: 'ok',
          message: `Terpasang (Range: ${pools[0].ranges || '192.168.200.100-192.168.200.200'})`,
          detail: pools[0],
        });
      } else {
        items.push({
          key: 'pool',
          label: "IP Pool 'pool-isolir'",
          status: 'missing',
          message: "IP Pool 'pool-isolir' belum ditemukan di /ip/pool MikroTik.",
        });
      }
    } catch (e: any) {
      items.push({
        key: 'pool',
        label: "IP Pool 'pool-isolir'",
        status: 'error',
        message: `Error memeriksa IP pool: ${e.message}`,
      });
    }

    // 2. Verify /ppp/profile (isolir)
    try {
      const profiles = await conn.execute('/ppp/profile/print', ['?name=isolir']);
      if (Array.isArray(profiles) && profiles.length > 0) {
        const prof = profiles[0];
        const rateLimit = prof['rate-limit'] || '64k/64k';
        const addressList = prof['address-list'] || 'isolir';
        items.push({
          key: 'profile',
          label: "PPP Profile 'isolir'",
          status: 'ok',
          message: `Terpasang (Rate: ${rateLimit}, Address-List: ${addressList})`,
          detail: prof,
        });
      } else {
        items.push({
          key: 'profile',
          label: "PPP Profile 'isolir'",
          status: 'missing',
          message: "Profile 'isolir' belum ditemukan di /ppp/profile MikroTik.",
        });
      }
    } catch (e: any) {
      items.push({
        key: 'profile',
        label: "PPP Profile 'isolir'",
        status: 'error',
        message: `Error memeriksa PPP profile: ${e.message}`,
      });
    }

    // 3. Verify /ip/firewall/address-list (payment-gateways)
    try {
      const addressLists = await conn.execute('/ip/firewall/address-list/print', [
        '?list=payment-gateways',
      ]);
      const count = Array.isArray(addressLists) ? addressLists.length : 0;
      if (count > 0) {
        items.push({
          key: 'whitelist',
          label: 'Address-List Payment Gateway',
          status: count >= 5 ? 'ok' : 'warning',
          message: `Terpasang (${count} domain payment gateway terdaftar)`,
        });
      } else {
        items.push({
          key: 'whitelist',
          label: 'Address-List Payment Gateway',
          status: 'missing',
          message: "Address-list 'payment-gateways' belum ditemukan di Firewall.",
        });
      }
    } catch (e: any) {
      items.push({
        key: 'whitelist',
        label: 'Address-List Payment Gateway',
        status: 'error',
        message: `Error memeriksa address-list: ${e.message}`,
      });
    }

    // 4. Verify /ip/firewall/nat (Redirect rules)
    try {
      const natRules = await conn.execute('/ip/firewall/nat/print', [
        '?src-address-list=isolir',
      ]);
      const count = Array.isArray(natRules) ? natRules.length : 0;
      if (count >= 1) {
        items.push({
          key: 'nat',
          label: 'NAT Redirect Port 80 & 443',
          status: 'ok',
          message: `Terpasang (${count} aturan DST-NAT redirect isolir)`,
        });
      } else {
        items.push({
          key: 'nat',
          label: 'NAT Redirect Port 80 & 443',
          status: 'missing',
          message: 'Aturan DST-NAT redirect isolir belum ditemukan di /ip/firewall/nat.',
        });
      }
    } catch (e: any) {
      items.push({
        key: 'nat',
        label: 'NAT Redirect Port 80 & 443',
        status: 'error',
        message: `Error memeriksa NAT rules: ${e.message}`,
      });
    }

    // 5. Verify /ip/firewall/filter (Drop rules)
    try {
      const filterRules = await conn.execute('/ip/firewall/filter/print', [
        '?src-address-list=isolir',
      ]);
      const count = Array.isArray(filterRules) ? filterRules.length : 0;
      if (count >= 1) {
        items.push({
          key: 'filter',
          label: 'Firewall Filter & Drop Rules',
          status: 'ok',
          message: `Terpasang (${count} aturan filter isolir aktif)`,
        });
      } else {
        items.push({
          key: 'filter',
          label: 'Firewall Filter & Drop Rules',
          status: 'missing',
          message: 'Aturan filter drop isolir belum ditemukan di /ip/firewall/filter.',
        });
      }
    } catch (e: any) {
      items.push({
        key: 'filter',
        label: 'Firewall Filter & Drop Rules',
        status: 'error',
        message: `Error memeriksa filter rules: ${e.message}`,
      });
    }

    const isFullyConfigured = items.every((i) => i.status === 'ok');

    return {
      success: true,
      routerName: router.name,
      routerIp: router.ipAddress || router.nasname || 'Unknown',
      isFullyConfigured,
      items,
      timestamp: new Date().toISOString(),
    };
  }
}
