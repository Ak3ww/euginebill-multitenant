import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { createPppoeUser } from '@/server/services/pppoe.service';
import { getTechnicianSession } from '@/server/auth/technician-auth';

export async function POST(req: NextRequest) {
  const tech = await getTechnicianSession(req);
  if (!tech) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { username, password, profileId, name, phone } = body;

    if (!username || !password || !profileId || !name || !phone) {
      return NextResponse.json(
        { error: 'Field wajib: username, password, profileId, name, phone' },
        { status: 400 },
      );
    }

    // Build a mock session for the service
    const mockSession = {
      user: { id: tech.id, name: tech.name, email: tech.email ?? '' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as any;

    const result = await createPppoeUser(body, mockSession, req);

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'DUPLICATE_USERNAME') {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err.code === 'NOT_FOUND') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error('Technician create PPPoE user error:', error);
    return NextResponse.json({ error: 'Gagal membuat pelanggan' }, { status: 500 });
  }
}
