import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { jwtVerify } from 'jose';
import { TECH_JWT_SECRET } from '@/server/auth/technician-secret';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';

export const dynamic = 'force-dynamic';

// GET - Fetch ODPs for technician autocomplete and GPS matching
// Includes usedPorts: array of port numbers currently occupied by active customers
export async function GET(req: NextRequest) {
  // Support both NextAuth session (admin user) and technician JWT cookie (portal teknisi)
  let authenticated = false;
  const session = await getServerSession(authOptions);
  if (session?.user) {
    authenticated = true;
  } else {
    const token = req.cookies.get('technician-token')?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, TECH_JWT_SECRET);
        if (payload?.id) authenticated = true;
      } catch {
        authenticated = false;
      }
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const odps = await prisma.networkODP.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        portCount: true,
        status: true,
        customers: {
          where: {
            customer: {
              status: {
                // Ports are FREE again for stopped/isolated/suspended customers
                notIn: ['stop', 'isolated', 'suspended', 'blocked', 'cabut'],
              },
            },
          },
          select: {
            portNumber: true,
            customer: {
              select: { name: true, customerId: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = odps.map((odp) => ({
      id: odp.id,
      name: odp.name,
      latitude: odp.latitude,
      longitude: odp.longitude,
      portCount: odp.portCount,
      status: odp.status,
      usedPorts: odp.customers.map((c) => ({
        portNumber: c.portNumber,
        customerName: c.customer?.name || 'Pelanggan',
        customerId: c.customer?.customerId || '',
      })),
    }));

    return NextResponse.json({ success: true, odps: result });
  } catch (error: any) {
    console.error('Fetch technician ODPs error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ODPs' },
      { status: 500 }
    );
  }
}
