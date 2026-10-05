import { NextRequest, NextResponse } from 'next/server';
import { getTechnicianSession } from '@/server/auth/technician-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getTechnicianSession(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      technician: {
        id: session.id,
        name: session.name,
        username: session.username,
        phoneNumber: session.phoneNumber,
        email: session.email,
        role: session.role,
        type: session.type,
      },
    });
  } catch (error) {
    console.error('Get technician session error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }
}
