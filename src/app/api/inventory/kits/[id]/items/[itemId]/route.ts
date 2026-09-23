import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const deleteResult = await prisma.workOrderTypeKitItem.deleteMany({
      where: {
        kitId: id,
        OR: [
          { id: itemId },
          { itemId: itemId },
        ],
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Kit item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Kit item removed successfully' });
  } catch (error: any) {
    console.error('Error removing kit item:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove kit item' }, { status: 500 });
  }
}
