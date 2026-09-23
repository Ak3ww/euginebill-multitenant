import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { PPPSecretService } from '@/server/services/mikrotik/ppp-secret.service';
import { MikroTikConnection } from '@/server/services/mikrotik/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn: MikroTikConnection | null = null;
  try {
    const { id: routerId } = await params;

    // Check auth or initial setup mode
    const session = await getServerSession(authOptions);
    if (!session) {
      const [adminCount, companyCount] = await Promise.all([
        prisma.adminUser.count(),
        prisma.company.count(),
      ]);
      const isSetupMode = adminCount === 0 || companyCount === 0;
      if (!isSetupMode) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const router = await prisma.router.findUnique({
      where: { id: routerId },
      include: { vpnClient: true },
    });

    if (!router) {
      return NextResponse.json({
        success: false,
        error: 'Router tidak ditemukan',
        pools: [],
        profiles: [],
        addresses: [],
      }, { status: 404 });
    }

    if (!router.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Router tidak aktif',
        pools: [],
        profiles: [],
        addresses: [],
      });
    }

    // Connect with 5000ms timeout guard
    const connectionResult = await PPPSecretService.connectToRouter(router, 5000);
    conn = connectionResult.conn;

    // Fetch resources in parallel with timeout guard
    const [rawPools, rawProfiles, rawAddresses] = await Promise.all([
      conn.execute('/ip/pool/print', [], 5000).catch((e: any) => {
        console.warn(`[RouterResources] Error fetching pools: ${e?.message}`);
        return [];
      }),
      conn.execute('/ppp/profile/print', [], 5000).catch((e: any) => {
        console.warn(`[RouterResources] Error fetching profiles: ${e?.message}`);
        return [];
      }),
      conn.execute('/ip/address/print', [], 5000).catch((e: any) => {
        console.warn(`[RouterResources] Error fetching addresses: ${e?.message}`);
        return [];
      }),
    ]);

    // Format IP Pools
    const pools = (Array.isArray(rawPools) ? rawPools : [])
      .map((p: any) => ({
        name: String(p['name'] || '').trim(),
        ranges: String(p['ranges'] || '').trim(),
      }))
      .filter((p: any) => Boolean(p.name));

    // Format PPP Profiles
    const profiles = (Array.isArray(rawProfiles) ? rawProfiles : [])
      .map((p: any) => ({
        name: String(p['name'] || '').trim(),
        rateLimit: String(p['rate-limit'] || '').trim(),
        localAddress: String(p['local-address'] || '').trim(),
        remoteAddress: String(p['remote-address'] || '').trim(),
        onlyOne: String(p['only-one'] || '').trim(),
      }))
      .filter((p: any) => Boolean(p.name));

    // Format Interface IP Addresses (for local-address suggestions)
    const addresses = (Array.isArray(rawAddresses) ? rawAddresses : [])
      .map((a: any) => {
        const fullAddr = String(a['address'] || '').trim();
        const ipOnly = fullAddr.split('/')[0];
        return {
          address: fullAddr,
          ip: ipOnly,
          interface: String(a['interface'] || '').trim(),
          network: String(a['network'] || '').trim(),
          comment: String(a['comment'] || '').trim(),
          disabled: a['disabled'] === 'true' || a['disabled'] === true,
        };
      })
      .filter((a: any) => Boolean(a.ip) && !a.disabled);

    return NextResponse.json({
      success: true,
      pools,
      profiles,
      addresses,
    });
  } catch (err: any) {
    console.warn('[RouterResources] Router unreachable or timed out:', err?.message || err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Router tidak aktif atau koneksi timeout (5000ms)',
      pools: [],
      profiles: [],
      addresses: [],
    });
  } finally {
    if (conn) {
      try {
        await conn.disconnect();
      } catch {
        // ignore close error
      }
    }
  }
}
