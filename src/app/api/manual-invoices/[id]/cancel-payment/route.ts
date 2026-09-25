import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';
import { ok, badRequest, unauthorized, notFound, serverError } from '@/lib/api-response';

type RouteParams = { params: Promise<{ id: string }> };

// POST - Batalkan pelunasan invoice manual
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  try {
    const { id } = await params;

    const invoice = await prisma.manualInvoice.findUnique({ where: { id } });
    if (!invoice) return notFound('Invoice');

    if (invoice.status !== 'PAID') {
      return badRequest('Hanya invoice dengan status PAID yang dapat dibatalkan pelunasannya');
    }

    await prisma.$transaction(async (tx) => {
      // Delete associated income transaction record
      const orConditions = [];
      if (invoice.transactionId) {
        orConditions.push({ id: invoice.transactionId });
      }
      if (invoice.invoiceNumber) {
        orConditions.push({ reference: invoice.invoiceNumber });
      }

      if (orConditions.length > 0) {
        await tx.transaction.deleteMany({
          where: { OR: orConditions },
        });
      }

      // Revert status to PENDING, set paidAt = null, transactionId = null
      await tx.manualInvoice.update({
        where: { id },
        data: {
          status: 'PENDING',
          paidAt: null,
          transactionId: null,
        },
      });
    });

    return ok({
      success: true,
      message: 'Pelunasan invoice manual berhasil dibatalkan.',
    });
  } catch (error) {
    console.error('POST /api/manual-invoices/[id]/cancel-payment error:', error);
    return serverError('Gagal membatalkan pelunasan invoice manual');
  }
}
