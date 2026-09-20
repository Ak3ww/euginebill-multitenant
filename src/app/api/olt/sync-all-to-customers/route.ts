import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { syncAllOltsWithCustomersAndInventory } from '@/server/services/olt-inventory-sync.service';

export const dynamic = 'force-dynamic';

// POST /api/olt/sync-all-to-customers
// Triggers full smart synchronization of all OLT ONUs to PPPoE Customers and Inventory Assets
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const minScore = typeof body?.minScore === 'number' ? body.minScore : 75;

    const stats = await syncAllOltsWithCustomersAndInventory(minScore);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${stats.totalOnus} modem OLT ke inventori dan ${stats.alreadyLinkedCount + stats.newlyMatchedCount} pelanggan.`,
      stats,
    });
  } catch (error: any) {
    console.error('POST /api/olt/sync-all-to-customers error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyinkronkan modem OLT ke inventori dan pelanggan' },
      { status: 500 }
    );
  }
}
