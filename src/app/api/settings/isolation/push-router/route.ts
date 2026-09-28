import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { IsolationSyncService } from '@/server/services/mikrotik/isolation-sync.service';

/**
 * POST /api/settings/isolation/push-router
 * Automatically pushes isolation rules (pool, profile, whitelist, nat, filter) to a MikroTik router via API.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routerId, settings } = body;

    if (!routerId) {
      return NextResponse.json(
        { success: false, error: 'routerId is required' },
        { status: 400 }
      );
    }

    const result = await IsolationSyncService.pushIsolationToRouter(routerId, settings);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.details,
    });
  } catch (error: any) {
    console.error('[Isolation Push Router API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memasang konfigurasi isolasi ke router',
      },
      { status: 500 }
    );
  }
}
