import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

// GET /api/pppoe/routers
// Backward-compatible alias endpoint returning router list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const routers = await prisma.router.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nasname: true,
        shortname: true,
        type: true,
        ports: true,
        secret: true,
        server: true,
        community: true,
        description: true,
        ipAddress: true,
        username: true,
        vpnClientId: true,
      },
    });

    return NextResponse.json({ success: true, routers });
  } catch (error: any) {
    console.error('GET /api/pppoe/routers error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat data router' },
      { status: 500 }
    );
  }
}
