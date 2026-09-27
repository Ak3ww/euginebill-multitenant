/**
 * Prisma Client Singleton — EugineBill Radius
 *
 * Single instance of PrismaClient yang digunakan di seluruh server-side code.
 * File ini HANYA boleh diimport di server-side (API routes, services, repositories).
 *
 * Lokasi lama: src/lib/prisma.ts (sekarang re-export proxy)
 * Lokasi baru: src/server/db/client.ts (file ini)
 */

import { PrismaClient } from '@prisma/client'
import { getTenantFromRequest, getTenantPrisma, masterPrisma } from './tenant-manager'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  processGuardsRegistered: boolean | undefined
}

export const prisma = (globalForPrisma.prisma ?? new Proxy(masterPrisma, {
  get(target, prop, receiver) {
    let tenantClient: PrismaClient | null = null;
    try {
      // Safely access current request headers in Next.js Server Components / Route Handlers
      const { headers } = require('next/headers');
      const headerList = headers();
      const slug = getTenantFromRequest({ headers: headerList });
      if (slug) {
        tenantClient = getTenantPrisma(slug);
      }
    } catch {
      // Outside request context (e.g. background jobs / build time / migrations)
    }

    const activeClient = tenantClient || target;
    const value = Reflect.get(activeClient, prop, activeClient);

    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
})) as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Ensure BigInt can be serialized to JSON across all API routes (prevents "Do not know how to serialize a BigInt")
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    const int = Number(this)
    return Number.isSafeInteger(int) ? int : this.toString()
  }
}

// Register once to prevent process crash loops from external connector exceptions
// (e.g., intermittent MikroTik API socket errors from background jobs).
if (!globalForPrisma.processGuardsRegistered) {
  process.on('uncaughtException', (error) => {
    console.error('[Process] uncaughtException:', error)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[Process] unhandledRejection:', reason)
  })

  globalForPrisma.processGuardsRegistered = true
}
