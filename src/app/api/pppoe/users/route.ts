import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';
import { ok, created, badRequest, unauthorized, notFound, conflict, serverError } from '@/lib/api-response';
import {
  listPppoeUsers,
  getPppoeUserById,
  createPppoeUser,
  updatePppoeUser,
  deletePppoeUser,
} from '@/server/services/pppoe.service';

export const dynamic = 'force-dynamic';

// GET - List all PPPoE users
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const users = await listPppoeUsers({ status: searchParams.get('status') });
    return ok({ users, count: users.length });
  } catch (error) {
    console.error('Get PPPoE users error:', error);
    return serverError();
  }
}

// POST - Create new PPPoE user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const { name, phone, pppoeCustomerId, noPppoeAccount } = body;

    let targetProfileId = body.profileId;
    if (!targetProfileId) {
      const searchName = body.profileName || body.groupName;
      let matchedProfile = searchName
        ? await prisma.pppoeProfile.findFirst({
            where: {
              OR: [
                { id: searchName },
                { name: searchName },
                { groupName: searchName },
              ],
            },
          })
        : null;

      if (!matchedProfile) {
        matchedProfile = await prisma.pppoeProfile.findFirst({ where: { isActive: true } });
      }

      if (matchedProfile) {
        targetProfileId = matchedProfile.id;
        body.profileId = matchedProfile.id;
      }
    }

    if (!targetProfileId) {
      return badRequest('Paket internet (profileId) belum dipilih dan belum ada paket di database');
    }
    if (!noPppoeAccount && (!body.username || !body.password)) {
      return badRequest('Username dan password wajib diisi untuk akun PPPoE');
    }
    if (!pppoeCustomerId && (!name || !phone)) {
      return badRequest('Nama dan No. HP wajib diisi jika tidak menghubungkan ke pelanggan');
    }

    const result = await createPppoeUser(body, session, request);
    const warning = (!result.mikrotikSynced && result.mikrotikError)
      ? `Pelanggan tersimpan di database, tetapi gagal sinkronisasi ke MikroTik: ${result.mikrotikError}`
      : undefined;
    return created({ success: true, ...result, warning });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'DUPLICATE_USERNAME') return conflict(err.message!);
    if (err.code === 'NOT_FOUND') return notFound(err.message);
    console.error('Create PPPoE user error:', error);
    return serverError(err.message || 'Gagal membuat pelanggan PPPoE');
  }
}

// PUT - Update PPPoE user
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    if (!body.id) return badRequest('User ID is required');

    const user = await updatePppoeUser(body, session, request);
    return ok({ success: true, user });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'NOT_FOUND') return notFound(err.message);
    if (err.code === 'DUPLICATE_USERNAME') return conflict(err.message!);
    console.error('Update PPPoE user error:', error);
    return serverError(err.message || 'Gagal memperbarui pelanggan PPPoE');
  }
}

// DELETE - Remove PPPoE user
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('User ID is required');
    const deleteSecretParam = searchParams.get('deleteSecret');
    const deleteSecretFromMikrotik = deleteSecretParam === 'true';

    const result = await deletePppoeUser(id, session, request, { deleteSecretFromMikrotik });
    return ok({ success: true, message: 'User deleted successfully', ...result });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'NOT_FOUND') return notFound(err.message);
    console.error('Delete PPPoE user error:', error);
    return serverError(err.message || 'Failed to delete PPPoE user');
  }
}
