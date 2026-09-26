import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';
import { signSaaSToken, ensureDefaultSaaSAdmin } from '@/server/auth/saas-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Ensure default master admin exists if table is empty
    await ensureDefaultSaaSAdmin();

    const user = await prisma.saaSAdminUser.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: username.trim().toLowerCase() },
        ],
      },
    });

    let isValid = false;
    let authUser = null;

    if (user) {
      isValid = await bcrypt.compare(password, user.passwordHash);
      if (isValid) {
        authUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    } else {
      // Fallback master fallback for initial dev bootstrap
      const fallbackPass = process.env.SAAS_ADMIN_PASSWORD || 'EugineBill2026!';
      if ((username === 'superadmin' || username === 'admin') && password === fallbackPass) {
        isValid = true;
        authUser = {
          id: 'master-superadmin-id',
          username: 'superadmin',
          email: 'admin@euginebill.com',
          name: 'EugineBill Master Admin',
          role: 'SUPERADMIN' as const,
        };
      }
    }

    if (!isValid || !authUser) {
      return NextResponse.json(
        { error: 'Username atau password tidak valid.' },
        { status: 401 }
      );
    }

    const token = await signSaaSToken(authUser);

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: authUser,
    });

    response.cookies.set({
      name: 'saas_admin_token',
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error('[SaaS Login Error]', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server saat login.' },
      { status: 500 }
    );
  }
}
