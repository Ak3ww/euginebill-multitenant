#!/usr/bin/env bash
# ==============================================================================
# EugineBill RADIUS — 1-Command Automated Domain & SSL Setup
# Usage:
#   sudo bash scripts/setup-domain-ssl.sh <yourdomain.com> [admin_email]
# Example:
#   sudo bash scripts/setup-domain-ssl.sh r4net.web.id
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    log_error "Harap jalankan script ini dengan sudo / user root: sudo bash scripts/setup-domain-ssl.sh <domain>"
    exit 1
fi

DOMAIN="$1"
EMAIL="$2"
PROJECT_DIR="$(pwd)"

if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Masukkan nama domain Anda (contoh: r4net.web.id):${NC} "
    read -r DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    log_error "Domain tidak boleh kosong."
    exit 1
fi

# Clean domain string
DOMAIN=$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*$||')

log_info "======================================================"
log_info " Memulai Konfigurasi 1-Langkah untuk Domain: $DOMAIN "
log_info "======================================================"

# 1. Install Certbot jika belum terpasang
log_info "1/5 Memeriksa paket Certbot Nginx..."
if ! command -v certbot &> /dev/null; then
    apt-get update -y && apt-get install -y certbot python3-certbot-nginx
fi
log_success "Certbot siap."

# 2. Update Konfigurasi Nginx
log_info "2/5 Mengonfigurasi Nginx Reverse Proxy..."
NGINX_CONF="/etc/nginx/sites-available/euginebill"

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN} admin.${DOMAIN} teknisi.${DOMAIN} technician.${DOMAIN} customer.${DOMAIN} agent.${DOMAIN} *.${DOMAIN};

    client_max_body_size 100M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    # Static Next.js Cache
    location /_next/static/ {
        alias ${PROJECT_DIR}/.next/static/;
        expires 365d;
        access_log off;
    }

    # Reverse proxy ke Next.js Port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/euginebill
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log_success "Konfigurasi Nginx diperbarui."

# 3. Terbitkan Sertifikat SSL HTTPS via Certbot
log_info "3/5 Menerbitkan Sertifikat SSL HTTPS Let's Encrypt..."

CERTBOT_DOMAINS="-d ${DOMAIN} -d www.${DOMAIN} -d admin.${DOMAIN} -d teknisi.${DOMAIN} -d customer.${DOMAIN}"
EMAIL_FLAG="--register-unsafely-without-email"
if [ -n "$EMAIL" ]; then
    EMAIL_FLAG="--email ${EMAIL}"
fi

# Coba multi-subdomain dulu, jika ada DNS subdomain yg belum resolve, fallback ke root domain
if certbot --nginx ${CERTBOT_DOMAINS} --agree-tos --non-interactive --redirect ${EMAIL_FLAG} 2>/dev/null; then
    log_success "Sertifikat SSL untuk domain utama & subdomain berhasil diterbitkan!"
else
    log_warn "Sertifikat multi-subdomain gagal (kemungkinan DNS subdomain belum dipointing). Mencoba domain utama (${DOMAIN} & www.${DOMAIN})..."
    if certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --agree-tos --non-interactive --redirect ${EMAIL_FLAG}; then
        log_success "Sertifikat SSL untuk ${DOMAIN} berhasil diterbitkan!"
    else
        log_warn "Penerbitan SSL otomatis gagal. Pastikan DNS Record di Cloudflare mengarah ke IP VPS ini dan Proxy Cloudflare di-set ke 'DNS Only'."
    fi
fi

systemctl reload nginx

# 4. Update file .env
log_info "4/5 Memperbarui file .env..."
if [ -f "${PROJECT_DIR}/.env" ]; then
    # Update NEXT_PUBLIC_APP_URL
    if grep -q "^NEXT_PUBLIC_APP_URL=" "${PROJECT_DIR}/.env"; then
        sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=\"https://${DOMAIN}\"|" "${PROJECT_DIR}/.env"
    else
        echo "NEXT_PUBLIC_APP_URL=\"https://${DOMAIN}\"" >> "${PROJECT_DIR}/.env"
    fi

    # Update NEXTAUTH_URL
    if grep -q "^NEXTAUTH_URL=" "${PROJECT_DIR}/.env"; then
        sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://${DOMAIN}\"|" "${PROJECT_DIR}/.env"
    else
        echo "NEXTAUTH_URL=\"https://${DOMAIN}\"" >> "${PROJECT_DIR}/.env"
    fi

    # Pastikan JWT_SECRET terisi dari NEXTAUTH_SECRET jika kosong
    if ! grep -q "^JWT_SECRET=" "${PROJECT_DIR}/.env"; then
        NEXTAUTH_VAL=$(grep "^NEXTAUTH_SECRET=" "${PROJECT_DIR}/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$NEXTAUTH_VAL" ]; then
            echo "JWT_SECRET=\"${NEXTAUTH_VAL}\"" >> "${PROJECT_DIR}/.env"
        fi
    fi
    log_success "File .env berhasil diperbarui ke https://${DOMAIN}."
fi

# 5. Update Company Base URL di Database
log_info "5/5 Memperbarui Base URL di Database..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const company = await prisma.company.findFirst();
  if (company) {
    await prisma.company.update({
      where: { id: company.id },
      data: { baseUrl: 'https://${DOMAIN}' }
    });
    console.log('✅ Base URL di Company diperbarui ke https://${DOMAIN}');
  }
}
run().finally(() => prisma.\$disconnect());
" 2>/dev/null || log_warn "Update database lewat script dilewati (tidak fatal)."

# 6. Restart PM2
log_info "Memuat ulang layanan aplikasi..."
pm2 restart EugineBill-radius 2>/dev/null || pm2 restart all 2>/dev/null || true

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  🎉 DOMAIN & SSL BERHASIL DIKONFIGURASI OTOMATIS!    ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
echo -e "Portal Anda kini dapat diakses dengan HTTPS:"
echo -e "  🌐 ${CYAN}Landing Page / Login :${NC} https://${DOMAIN}"
echo -e "  🔑 ${CYAN}Portal Admin         :${NC} https://${DOMAIN}/admin (atau https://admin.${DOMAIN})"
echo -e "  🔧 ${CYAN}Portal Teknisi       :${NC} https://${DOMAIN}/technician (atau https://teknisi.${DOMAIN})"
echo -e "  👥 ${CYAN}Portal Pelanggan     :${NC} https://${DOMAIN}/customer (atau https://customer.${DOMAIN})"
echo ""
