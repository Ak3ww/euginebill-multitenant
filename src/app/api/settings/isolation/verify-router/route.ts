import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { IsolationSyncService } from '@/server/services/mikrotik/isolation-sync.service';

/**
 * POST /api/settings/isolation/verify-router
 * Verifies whether isolation pool, profile, whitelist, nat, and filter rules exist on a MikroTik router.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routerId } = body;

    if (!routerId) {
      return NextResponse.json(
        { success: false, error: 'routerId is required' },
        { status: 400 }
      );
    }

    const result = await IsolationSyncService.verifyIsolationOnRouter(routerId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Isolation Verify Router API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memverifikasi konfigurasi isolasi pada router',
      },
      { status: 500 }
    );
  }
}
