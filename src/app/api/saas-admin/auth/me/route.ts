import { NextRequest, NextResponse } from 'next/server';
import { getSaaSSession } from '@/server/auth/saas-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSaaSSession();
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Belum login sebagai SaaS SuperAdmin.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
    });
  } catch (err) {
    return NextResponse.json(
      { authenticated: false, error: 'Sesi tidak valid.' },
      { status: 401 }
    );
  }
}
