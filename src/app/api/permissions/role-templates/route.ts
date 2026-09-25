import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { AdminRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';

import { DEFAULT_ROLE_TEMPLATES } from '@/server/auth/permissions';

/**
 * GET /api/permissions/role-templates
 * Get permission templates for all roles
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all role permissions grouped by role
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: {
          select: {
            id: true,
            key: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Group by role
    const templates: Record<AdminRole, string[]> = {
      SUPER_ADMIN: [],
      FINANCE: [],
      CUSTOMER_SERVICE: [],
      TECHNICIAN: [],
      MARKETING: [],
      VIEWER: [],
      WAREHOUSE: [],
    };

    rolePermissions.forEach((rp) => {
      if (rp.role in templates) {
        templates[rp.role].push(rp.permission.key);
      }
    });

    // Fallback to DEFAULT_ROLE_TEMPLATES if a role has no DB entries
    (Object.keys(templates) as AdminRole[]).forEach((role) => {
      if (templates[role].length === 0 && DEFAULT_ROLE_TEMPLATES[role]) {
        templates[role] = [...DEFAULT_ROLE_TEMPLATES[role]];
      }
      if (role === 'WAREHOUSE') {
        templates.WAREHOUSE = templates.WAREHOUSE.filter(
          (k) => k !== 'dashboard.view' && k !== 'reports.view'
        );
      }
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching role templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role templates' },
      { status: 500 }
    );
  }
}
