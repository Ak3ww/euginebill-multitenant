import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/server/db/client';
import { TECH_JWT_SECRET } from '@/server/auth/technician-secret';

export interface TechnicianSession {
  id: string;
  name: string;
  username?: string | null;
  phoneNumber: string;
  email?: string | null;
  role: string;
  type: 'admin_user' | 'technician';
  isAdminUser: boolean;
}

export async function getTechnicianSession(req: NextRequest): Promise<TechnicianSession | null> {
  try {
    const cookieToken = req.cookies.get('technician-token')?.value;
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const token = cookieToken || headerToken;

    if (!token) return null;

    const { payload } = await jwtVerify(token, TECH_JWT_SECRET);

    if (payload.type === 'admin_user') {
      const user = await prisma.adminUser.findUnique({
        where: { id: payload.id as string },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) return null;

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        phoneNumber: user.phone || user.username,
        email: user.email,
        role: user.role,
        type: 'admin_user',
        isAdminUser: true,
      };
    }

    const tech = await prisma.technician.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        name: true,
        username: true,
        phoneNumber: true,
        email: true,
        isActive: true,
      },
    });

    if (!tech || !tech.isActive) return null;

    return {
      id: tech.id,
      name: tech.name,
      username: tech.username || tech.phoneNumber,
      phoneNumber: tech.phoneNumber,
      email: tech.email,
      role: 'TECHNICIAN',
      type: 'technician',
      isAdminUser: false,
    };
  } catch (err) {
    return null;
  }
}
