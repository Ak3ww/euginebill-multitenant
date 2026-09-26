/**
 * Multi-Tenant Database Manager — EugineBill SaaS Platform
 *
 * Manages Master Prisma Client and Dynamic Per-Tenant Prisma Client Connection Pool.
 * Each tenant connects to its isolated database (`euginebill_tenant_${slug}`).
 *
 * @module server/db/tenant-manager
 */

import { PrismaClient, Tenant } from '@prisma/client';
import { prisma as defaultPrisma } from './client';

// Global reference for Master Prisma
const globalForMaster = globalThis as unknown as {
  masterPrisma: PrismaClient | undefined;
  tenantPool: Map<string, { client: PrismaClient; lastUsed: number }> | undefined;
};

export const masterPrisma = globalForMaster.masterPrisma ?? defaultPrisma;
if (process.env.NODE_ENV !== 'production') {
  globalForMaster.masterPrisma = masterPrisma;
}

// In-Memory Connection Pool Configuration
const MAX_POOL_SIZE = 50;
const tenantPool = globalForMaster.tenantPool ?? new Map<string, { client: PrismaClient; lastUsed: number }>();
if (process.env.NODE_ENV !== 'production') {
  globalForMaster.tenantPool = tenantPool;
}

/**
 * Derives the database connection URL for a specific tenant from the master DATABASE_URL.
 */
export function getTenantDbUrl(tenantSlug: string, customDbName?: string): string {
  const masterUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/euginebill_master';
  const cleanSlug = tenantSlug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const dbName = customDbName || `euginebill_tenant_${cleanSlug}`;

  try {
    const parsed = new URL(masterUrl);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    // Regex replacement fallback
    return masterUrl.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
  }
}

/**
 * Gets or creates a PrismaClient instance for a given tenant database with LRU pool eviction.
 */
export function getTenantPrisma(tenantSlug: string, customDbUrl?: string): PrismaClient {
  const cleanSlug = tenantSlug.toLowerCase().trim();
  const cached = tenantPool.get(cleanSlug);

  if (cached) {
    cached.lastUsed = Date.now();
    return cached.client;
  }

  // LRU Eviction: Remove oldest client if pool size exceeds limit
  if (tenantPool.size >= MAX_POOL_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of tenantPool.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const evicted = tenantPool.get(oldestKey);
      tenantPool.delete(oldestKey);
      if (evicted) {
        evicted.client.$disconnect().catch((err) => {
          console.warn(`[TenantPool] Error disconnecting evicted tenant client '${oldestKey}':`, err.message);
        });
      }
    }
  }

  const dbUrl = customDbUrl || getTenantDbUrl(cleanSlug);

  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  tenantPool.set(cleanSlug, {
    client,
    lastUsed: Date.now(),
  });

  return client;
}

/**
 * Disconnects and removes a tenant's PrismaClient from the pool.
 */
export async function disconnectTenantPrisma(tenantSlug: string): Promise<void> {
  const cleanSlug = tenantSlug.toLowerCase().trim();
  const entry = tenantPool.get(cleanSlug);
  if (entry) {
    tenantPool.delete(cleanSlug);
    await entry.client.$disconnect().catch(() => {});
  }
}

/**
 * Disconnects all pooled tenant clients (useful during teardown / testing).
 */
export async function disconnectAllTenantPrisma(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const [, entry] of tenantPool.entries()) {
    promises.push(entry.client.$disconnect().catch(() => {}));
  }
  tenantPool.clear();
  await Promise.all(promises);
}

/**
 * Inspects a request object and extracts the tenant slug.
 * Checks `x-tenant-slug`, `x-tenant-id`, `host` subdomain, or query parameters.
 */
export function getTenantFromRequest(req: any): string | null {
  if (!req) return null;

  let headers: Headers | Record<string, string | string[] | undefined> | null = null;
  let urlStr: string | null = null;

  if (typeof req.headers?.get === 'function') {
    headers = req.headers;
  } else if (req.headers && typeof req.headers === 'object') {
    headers = req.headers;
  }

  if (typeof req.url === 'string') {
    urlStr = req.url;
  }

  // 1. Explicit Header: x-tenant-slug
  const headerSlug = getHeaderValue(headers, 'x-tenant-slug');
  if (headerSlug) return headerSlug.toLowerCase().trim();

  // 2. Explicit Header: x-tenant-id
  const headerId = getHeaderValue(headers, 'x-tenant-id');
  if (headerId) return headerId.toLowerCase().trim();

  // 3. Query Parameter: ?tenant=slug or ?slug=slug
  if (urlStr) {
    try {
      const url = new URL(urlStr, 'http://localhost');
      const qTenant = url.searchParams.get('tenant') || url.searchParams.get('slug');
      if (qTenant) return qTenant.toLowerCase().trim();
    } catch {
      // Ignore URL parsing errors
    }
  }

  // 4. Host Subdomain Resolution
  const host = getHeaderValue(headers, 'x-forwarded-host') || getHeaderValue(headers, 'host');
  if (host) {
    const slugFromHost = extractSlugFromHost(host);
    if (slugFromHost) return slugFromHost;
  }

  return null;
}

/**
 * Helper to safely read a header value from different Header formats.
 */
function getHeaderValue(headers: any, name: string): string | null {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get(name) || null;
  }
  const val = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] || null;
  return typeof val === 'string' ? val : null;
}

/**
 * Extracts tenant slug from a hostname.
 * Examples:
 * - "citranet.euginebill.com" -> "citranet"
 * - "demo1.billing.domain.id" -> "demo1"
 * - "billing.domain.com" -> null (main portal)
 * - "localhost:3000" -> null
 */
export function extractSlugFromHost(hostHeader: string): string | null {
  const cleanHost = hostHeader.split(':')[0].toLowerCase().trim();

  // Ignored / apex hostnames
  const ignoredHosts = new Set([
    'localhost',
    '127.0.0.1',
    'euginemediagroup.site',
    'www.euginemediagroup.site',
    'saas.euginemediagroup.site',
    'app.euginemediagroup.site',
    'billing.euginemediagroup.site',
    'admin.euginemediagroup.site',
    'euginebill.com',
    'billing.euginebill.com',
    'app.euginebill.com',
    'admin.euginebill.com',
    'www.euginebill.com',
    'saas.euginebill.com',
  ]);

  if (ignoredHosts.has(cleanHost)) return null;

  // Check IP addresses
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return null;

  const parts = cleanHost.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const reserved = new Set(['www', 'api', 'app', 'billing', 'admin', 'auth', 'cdn', 'mail', 'saas']);
    if (!reserved.has(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

/**
 * Helper to query Tenant record from master database by slug, id, or custom domain.
 */
export async function getTenantRecord(slugOrIdOrDomain: string): Promise<Tenant | null> {
  const clean = slugOrIdOrDomain.trim();
  return masterPrisma.tenant.findFirst({
    where: {
      OR: [
        { slug: clean.toLowerCase() },
        { id: clean },
        { customDomain: clean.toLowerCase() },
      ],
    },
    include: {
      plan: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}
