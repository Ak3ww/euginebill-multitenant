import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';

export type SaaSAuthUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: 'SUPERADMIN' | 'SUPPORT';
};

const SAAS_JWT_SECRET = process.env.SAAS_JWT_SECRET || 'EugineBill-saas-superadmin-secret-key-32-chars-long!';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(SAAS_JWT_SECRET);
}

export async function signSaaSToken(user: SaaSAuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecretKey());
}

export async function verifySaaSToken(token: string): Promise<SaaSAuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      role: (payload.role as 'SUPERADMIN' | 'SUPPORT') || 'SUPERADMIN',
    };
  } catch {
    return null;
  }
}

export async function getSaaSSession(): Promise<SaaSAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('saas_admin_token')?.value;
    if (!token) return null;
    return await verifySaaSToken(token);
  } catch {
    return null;
  }
}

export async function ensureDefaultSaaSAdmin(): Promise<void> {
  try {
    const count = await prisma.saaSAdminUser.count();
    if (count === 0) {
      const defaultPassword = process.env.SAAS_ADMIN_PASSWORD || 'EugineBill2026!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await prisma.saaSAdminUser.create({
        data: {
          username: 'superadmin',
          email: 'admin@euginebill.com',
          name: 'EugineBill Master Admin',
          passwordHash,
          role: 'SUPERADMIN',
        },
      });
      console.log('[SaaS Auth] Created default master superadmin user: superadmin');
    }
  } catch (err) {
    console.error('[SaaS Auth] Error ensuring default admin user:', err);
  }
}
