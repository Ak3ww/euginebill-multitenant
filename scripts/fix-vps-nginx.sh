#!/bin/bash
# ==============================================================================
# EugineBill SaaS — Fix Nginx Static CSS/JS 404 & Subdomain Routing on VPS
# ==============================================================================
# Solves:
#   1. Nginx 404 on /_next/static/... (CSS and JS chunks unstyled)
#   2. Directory mismatch between /var/www/EugineBill-radius and /var/www/EugineBill-multitenant
#   3. Restrictive .next file permissions (0700/0750) blocking Nginx www-data
#   4. Dynamic wildcard subdomains (*.euginemediagroup.site) routing
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  EugineBill Multi-Tenant: Nginx & Static CSS/JS Fixer        ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERR] Script ini harus dijalankan sebagai root / sudo.${NC}"
  echo "Jalankan: sudo bash scripts/fix-vps-nginx.sh"
  exit 1
fi

APP_DIR="$(pwd)"
echo -e "${GREEN}[OK]${NC} Direktori kerja terdeteksi: $APP_DIR"

# 1. Pastikan aset standalone tersinkronisasi
echo -e "\n${YELLOW}==> 1. Sinkronisasi aset Next.js standalone...${NC}"
if [ -f "$APP_DIR/scripts/postbuild.js" ]; then
  node "$APP_DIR/scripts/postbuild.js" || true
fi

# 2. Perbaiki permissions folder .next dan public
echo -e "\n${YELLOW}==> 2. Memperbaiki izin akses (permissions) .next dan public...${NC}"
if [ -d "$APP_DIR/.next" ]; then
  chmod -R 755 "$APP_DIR/.next"
  echo -e "${GREEN}[OK]${NC} chmod -R 755 .next selesai."
fi
if [ -d "$APP_DIR/public" ]; then
  chmod -R 755 "$APP_DIR/public"
  echo -e "${GREEN}[OK]${NC} chmod -R 755 public selesai."
fi

# 3. Buat / Update Konfigurasi Nginx untuk euginemediagroup.site
echo -e "\n${YELLOW}==> 3. Memperbarui konfigurasi Nginx untuk *.euginemediagroup.site...${NC}"

NGINX_TARGET="/etc/nginx/sites-available/euginebill-multitenant"
if [ ! -d "/etc/nginx/sites-available" ]; then
  mkdir -p /etc/nginx/sites-available
fi
if [ ! -d "/etc/nginx/sites-enabled" ]; then
  mkdir -p /etc/nginx/sites-enabled
fi

# Backup file jika sudah ada
if [ -f "$NGINX_TARGET" ]; then
  cp "$NGINX_TARGET" "${NGINX_TARGET}.bak.$(date +%s)"
fi

# Buat config Nginx yang mengarahkan /_next/static/ langsung ke port 3000 (menghilangkan 404)
cat << 'EOF' > "$NGINX_TARGET"
# ==============================================================================
# EugineBill Multi-Tenant & Dynamic Subdomain Reverse Proxy
# Supports: euginemediagroup.site, *.euginemediagroup.site, Cloudflare Proxy
# ==============================================================================

# HTTP (Port 80) — Cloudflare Flexible & Let's Encrypt ACME
server {
    listen 80;
    listen [::]:80;
    server_name euginemediagroup.site *.euginemediagroup.site _;

    client_max_body_size 100M;

    proxy_connect_timeout 600;
    proxy_send_timeout    600;
    proxy_read_timeout    600;
    send_timeout          600;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    # ACME Challenge untuk Certbot jika dibutuhkan
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # CRITICAL: Proxy /_next/static/ ke Node.js port 3000 agar Next.js yang melayani
    # chunk CSS & JS miliknya sendiri tanpa ketergantungan path alias filesystem.
    location /_next/static/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API routes — no cache
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   CF-Connecting-IP $http_cf_connecting_ip;

        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' always;
        add_header Pragma 'no-cache' always;

        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-XSS-Protection;
        proxy_hide_header X-Content-Type-Options;
    }

    # Catch-all routes — Next.js Application
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   CF-Connecting-IP $http_cf_connecting_ip;
        proxy_cache_bypass $http_upgrade;

        add_header Cache-Control 'no-cache, must-revalidate' always;

        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-XSS-Protection;
        proxy_hide_header X-Content-Type-Options;
    }
}

# HTTPS (Port 443) — Cloudflare Full & Full (Strict)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name euginemediagroup.site *.euginemediagroup.site;

    ssl_certificate     /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    proxy_connect_timeout 600;
    proxy_send_timeout    600;
    proxy_read_timeout    600;
    send_timeout          600;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    # CRITICAL: Proxy /_next/static/ ke Node.js port 3000
    location /_next/static/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API routes — no cache
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   CF-Connecting-IP $http_cf_connecting_ip;

        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' always;
        add_header Pragma 'no-cache' always;

        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-XSS-Protection;
        proxy_hide_header X-Content-Type-Options;
    }

    # Catch-all routes — Next.js Application
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   CF-Connecting-IP $http_cf_connecting_ip;
        proxy_cache_bypass $http_upgrade;

        add_header Cache-Control 'no-cache, must-revalidate' always;

        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-XSS-Protection;
        proxy_hide_header X-Content-Type-Options;
    }
}
EOF

# Pastikan sertifikat self-signed ada jika port 443 digunakan
if [ ! -f "/etc/ssl/certs/nginx-selfsigned.crt" ] || [ ! -f "/etc/ssl/private/nginx-selfsigned.key" ]; then
  echo -e "${YELLOW}==> Membuat SSL Self-Signed untuk komunikasi Cloudflare Full...${NC}"
  mkdir -p /etc/ssl/private /etc/ssl/certs
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/CN=euginemediagroup.site/O=EugineBill/C=ID" 2>/dev/null
  chmod 600 /etc/ssl/private/nginx-selfsigned.key
  echo -e "${GREEN}[OK]${NC} SSL Self-Signed dibuat."
fi

# Aktifkan site Nginx
ln -sf "$NGINX_TARGET" /etc/nginx/sites-enabled/euginebill-multitenant

# Patch file config lama jika masih ada yang memakai alias statis
for conf in /etc/nginx/sites-enabled/EugineBill-radius /etc/nginx/sites-enabled/default; do
  if [ -f "$conf" ]; then
    echo -e "${YELLOW}==> Patching file config lama: $conf...${NC}"
    sed -i -E 's|alias /var/www/[^;]+/\.next/static/;|proxy_pass http://127.0.0.1:3000;|g' "$conf" 2>/dev/null || true
  fi
done

# 4. Tes dan reload Nginx
echo -e "\n${YELLOW}==> 4. Menguji konfigurasi Nginx...${NC}"
nginx -t

echo -e "\n${YELLOW}==> 5. Reload Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}[OK]${NC} Nginx berhasil di-reload."

# 5. Restart PM2 Next.js
echo -e "\n${YELLOW}==> 6. Restart PM2 Application...${NC}"
pm2 restart ecosystem.config.js --update-env 2>/dev/null || pm2 restart all --update-env 2>/dev/null || true
echo -e "${GREEN}[OK]${NC} PM2 restart selesai."

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}  PEMBERSIHAN & PERBAIKAN SELESAI DENGAN SUKSES!               ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "${YELLOW}CATATAN PENTING UNTUK CLOUDFLARE:${NC}"
echo "Karena Cloudflare sebelumnya sempat meng-cache respon 404:"
echo "1. Buka dashboard Cloudflare -> Domain euginemediagroup.site"
echo "2. Masuk ke menu Caching -> Configuration"
echo "3. Klik tombol 'Purge Everything' (Hapus Semua Cache)"
echo "4. Refresh browser dengan Ctrl + F5 (Hard Reload)"
echo -e "${CYAN}================================================================${NC}"
