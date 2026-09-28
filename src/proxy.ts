import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIsolationSettings, isIpInIsolationPool } from '@/server/services/isolation.service';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV !== 'production' ? 'EugineBill-radius-secret-change-in-production' : undefined);

/**
 * Proxy & Edge Subdomain Middleware:
 * 1. Multi-Tenant Subdomain Routing:
 *    - saas.domain.com / app.domain.com -> /saas-admin
 *    - <tenant-slug>.domain.com -> injects 'x-tenant-slug' header & rewrites to tenant portals
 *    - customer / agent / teknisi / admin subdomains -> mapped to portal paths
 * 2. Admin authentication (/admin routes)
 * 3. Isolated user detection (auto-redirect to /isolated page)
 * 4. Security headers & CSP
 * 5. Bot/scanner path blocking
 * 6. Brute-force rate limiting for admin login
 */

// ============================================
// In-memory rate limiter (Edge-compatible)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= max) return false; // blocked
  entry.count++;
  return true; // allowed
}

// Paths known to be attacked by bots / scanners — block them immediately
const BLOCKED_PATHS = [
  '/wp-admin', '/wp-login', '/.env', '/phpinfo', '/admin/config',
  '/config.php', '/setup.php', '/install.php', '/.git', '/xmlrpc.php',
  '/actuator', '/console', '/.well-known/security.txt',
];

// Suspicious User-Agent substrings
const BLOCKED_UA_PATTERNS = ['sqlmap', 'nikto', 'masscan', 'nmap', 'hydra', 'medusa'];

// Standard portal subdomains
const PORTAL_SUBDOMAIN_MAP: Record<string, string> = {
  'customer': '/customer',
  'pelanggan': '/customer',
  'agent': '/agent',
  'agen': '/agent',
  'teknisi': '/technician',
  'technician': '/technician',
  'admin': '/admin',
};

function applySecurityHeaders(res: NextResponse, tenantSlug?: string, isHttps = false): NextResponse {
  // X-Frame-Options: Prevents clickjacking attacks
  res.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options: Prevents MIME sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection: Legacy XSS protection
  res.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  
  // Content-Security-Policy (Permissive for Tailwind CSS + Fonts + Cloudflare)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://static.cloudflareinsights.com",
    "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https: http: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: http: https://api.fonnte.com https://api.wablas.com https://api.kirimi.id https://cloudflareinsights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : [])
  ].join('; ');
  res.headers.set('Content-Security-Policy', cspDirectives);
  
  // Extra security headers
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('X-Download-Options', 'noopen');
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  if (tenantSlug) {
    res.headers.set('x-tenant-slug', tenantSlug);
  }
  
  // Remove technology disclosure headers
  res.headers.delete('X-Powered-By');
  res.headers.delete('Server');
  
  return res;
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ============================================
  // 0a. BLOCK KNOWN SCANNER/BOT PATHS
  // ============================================
  if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 404 });
  }

  // ============================================
  // 0b. BLOCK SUSPICIOUS USER-AGENTS
  // ============================================
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  if (BLOCKED_UA_PATTERNS.some(p => ua.includes(p))) {
    return new NextResponse(null, { status: 403 });
  }

  // ============================================
  // 0c. ADMIN LOGIN BRUTE-FORCE PROTECTION
  // ============================================
  if (pathname === '/api/auth/callback/credentials' && req.method === 'POST') {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
    const allowed = inMemoryRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }
  }

  // ============================================
  // 0d. SUBDOMAIN & MULTI-TENANT EDGE ROUTING
  // ============================================
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const hostParts = hostname.split('.');

  const proto = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol).replace(':', '');
  const isHttps = proto === 'https';
  const targetProtocol = isHttps ? 'https:' : 'http:';

  const isSystem = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isStaticFile = /\.(ico|png|jpg|jpeg|gif|svg|js|css|woff|woff2|ttf|mp4|webp|json|txt|xml)$/.test(pathname);
  const isStandaloneRoute = 
    pathname.startsWith('/invoice') || 
    pathname.startsWith('/pay') || 
    pathname.startsWith('/isolated') || 
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/free-trial') ||
    pathname.startsWith('/trial') ||
    pathname.startsWith('/docs');

  let detectedTenantSlug: string | undefined = undefined;

  // If request comes with 3 or more domain parts (e.g. tenant.domain.com, saas.domain.com)
  if (hostParts.length >= 3) {
    const subdomain = hostParts[0];

    // Branch 1: SaaS Master Admin Routing (saas.domain.com or app.domain.com)
    if (subdomain === 'saas' || subdomain === 'app') {
      if (!isSystem && !isStaticFile && !isStandaloneRoute) {
        if (!pathname.startsWith('/saas-admin') && !pathname.startsWith('/saas')) {
          const url = req.nextUrl.clone();
          url.pathname = '/saas-admin' + (pathname === '/' ? '' : pathname);
          const rewriteRes = NextResponse.rewrite(url);
          return applySecurityHeaders(rewriteRes, undefined, isHttps);
        }
      }
    }
    // Branch 2: Standard Portal Subdomains (customer.domain.com, admin.domain.com, etc.)
    else if (PORTAL_SUBDOMAIN_MAP[subdomain]) {
      const targetBase = PORTAL_SUBDOMAIN_MAP[subdomain];
      if (!isSystem && !isStaticFile && !isStandaloneRoute) {
        if (!pathname.startsWith(targetBase)) {
          const url = req.nextUrl.clone();
          url.pathname = targetBase + (pathname === '/' ? '' : pathname);
          const rewriteRes = NextResponse.rewrite(url);
          return applySecurityHeaders(rewriteRes, undefined, isHttps);
        }
      }
    }
    // Branch 2b: WWW Subdomain (Treat as apex domain / SaaS landing page)
    else if (subdomain === 'www') {
      // Pass through directly to root SaaS landing page
    }
    // Branch 3: Multi-Tenant Tenant Subdomain (<tenant-slug>.domain.com)
    else {
      detectedTenantSlug = subdomain;
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-tenant-slug', subdomain);

      if (!isSystem && !isStaticFile && !isStandaloneRoute) {
        // If root path is accessed on tenant subdomain, route to /admin
        if (pathname === '/') {
          const url = req.nextUrl.clone();
          url.pathname = '/admin';
          const rewriteRes = NextResponse.rewrite(url, {
            request: { headers: requestHeaders },
          });
          return applySecurityHeaders(rewriteRes, detectedTenantSlug, isHttps);
        } else {
          // Pass x-tenant-slug header through to the requested route
          const nextRes = NextResponse.next({
            request: { headers: requestHeaders },
          });
          return applySecurityHeaders(nextRes, detectedTenantSlug, isHttps);
        }
      }
    }
  }

  // ============================================
  // 1. ISOLATION CHECK (for all non-static routes)
  // ============================================
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const sourceIp = forwarded?.split(',')[0]?.trim() || realIp || '';
  
  if (sourceIp) {
    try {
      const isolationSettings = await getIsolationSettings();
      const isIsolatedIp = isolationSettings.isolationEnabled && 
        isIpInIsolationPool(sourceIp, isolationSettings.isolationIpPool);
      
      if (isIsolatedIp) {
        const allowedPaths = [
          '/isolated', '/pay', '/setup', '/api', '/_next', '/favicon.ico', '/logo.png', '/images', '/admin', '/saas-admin'
        ];
        const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));
        const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
        
        if (!isAllowedPath && !hasFileExtension) {
          console.log(`[PROXY] Isolated IP detected: ${sourceIp}, redirecting to /isolated`);
          const url = req.nextUrl.clone();
          url.pathname = '/isolated';
          url.searchParams.set('ip', sourceIp);
          return NextResponse.redirect(url);
        }
      }
    } catch (error) {
      console.error('[PROXY] Error checking isolation settings:', error);
      // Fallback hardcoded check
      if (sourceIp.startsWith('192.168.200.')) {
        const allowedPaths = ['/isolated', '/pay', '/setup', '/api', '/_next', '/favicon.ico', '/logo.png', '/images', '/admin', '/saas-admin'];
        const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));
        const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
        
        if (!isAllowedPath && !hasFileExtension) {
          console.log(`[PROXY] Isolated IP detected (fallback): ${sourceIp}, redirecting to /isolated`);
          const url = req.nextUrl.clone();
          url.pathname = '/isolated';
          url.searchParams.set('ip', sourceIp);
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // ============================================
  // 2. ADMIN AUTH CHECK - only for /admin routes (except /admin/login)
  // ============================================
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/auth/two-factor') {
    if (!NEXTAUTH_SECRET) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('error', 'server_misconfigured');
      return NextResponse.redirect(loginUrl);
    }

    const token = await getToken({
      req,
      secret: NEXTAUTH_SECRET,
      secureCookie: false,
    });

    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ============================================
  // 3. PASS-THROUGH RESPONSE WITH SECURITY HEADERS
  // ============================================
  const response = NextResponse.next();
  return applySecurityHeaders(response, detectedTenantSlug, isHttps);
}

export const config = {
  matcher: [
    '/admin/:path*',  // Admin routes (auth required)
    '/saas-admin/:path*', // SaaS Admin routes
    '/api/auth/callback/:path*',  // NextAuth callback - untuk admin login brute-force protection
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json|manifest-admin.json|manifest-agent.json|manifest-customer.json|manifest-technician.json|pwa).*)', // All other routes (for isolated IP check + security headers)
  ],
};
