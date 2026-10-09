/**
 * idn-finlogos Helper & Brand Resolver
 * Integrasi resmi brand mark perbankan, fintech, e-wallet, dan payment gateway Indonesia.
 * Mendukung pencocokan otomatis berdasarkan nama resmi, singkatan, kode kliring bank, dan slug.
 */

export interface BrandMetadata {
  slug: string;
  name: string;
  category: 'bank' | 'ewallet' | 'gateway' | 'retail' | 'other';
  code?: string; // 3-digit kode bank ATM Bersama / PRIMA
  localPath: string;
  cdnUrl: string;
}

// Koleksi Bank Populer Indonesia untuk Quick-Pick di Admin Settings
export const POPULAR_INDONESIAN_BANKS: Array<{ code: string; slug: string; name: string }> = [
  { code: '014', slug: 'bca', name: 'BCA (Bank Central Asia)' },
  { code: '008', slug: 'mandiri', name: 'Bank Mandiri' },
  { code: '002', slug: 'bri', name: 'BRI (Bank Rakyat Indonesia)' },
  { code: '009', slug: 'bni', name: 'BNI (Bank Negara Indonesia)' },
  { code: '451', slug: 'bsi', name: 'BSI (Bank Syariah Indonesia)' },
  { code: '022', slug: 'cimb-niaga', name: 'CIMB Niaga' },
  { code: '013', slug: 'permata', name: 'Permata Bank' },
  { code: '011', slug: 'danamon', name: 'Bank Danamon' },
  { code: '200', slug: 'btn', name: 'Bank BTN' },
  { code: '535', slug: 'seabank', name: 'SeaBank Indonesia' },
  { code: '542', slug: 'jago', name: 'Bank Jago' },
  { code: '501', slug: 'blu-bca', name: 'blu by BCA Digital' },
  { code: '213', slug: 'jenius', name: 'Jenius (BTPN)' },
  { code: '490', slug: 'neobank', name: 'Neo Bank (BNC)' },
  { code: '110', slug: 'bank-bjb', name: 'Bank BJB' },
  { code: '114', slug: 'bank-jatim', name: 'Bank Jatim' },
  { code: '113', slug: 'bank-jateng', name: 'Bank Jateng' },
  { code: '153', slug: 'sinarmas', name: 'Bank Sinarmas' },
  { code: '019', slug: 'paninbank', name: 'Panin Bank' },
  { code: '567', slug: 'superbank', name: 'Superbank' },
];

// Dictionary pemetaan variasi input teks menuju slug standar idn-finlogos
const SLUG_ALIASES: Record<string, string> = {
  // Banks
  'bca': 'bca',
  'bank bca': 'bca',
  'bank central asia': 'bca',
  '014': 'bca',
  'bca syariah': 'bca',
  'mandiri': 'mandiri',
  'bank mandiri': 'mandiri',
  '008': 'mandiri',
  'livin': 'mandiri',
  'bri': 'bri',
  'bank bri': 'bri',
  'bank rakyat indonesia': 'bri',
  '002': 'bri',
  'brimo': 'bri',
  'bni': 'bni',
  'bank bni': 'bni',
  'bank negara indonesia': 'bni',
  '009': 'bni',
  'bsi': 'bsi',
  'bank bsi': 'bsi',
  'bank syariah indonesia': 'bsi',
  '451': 'bsi',
  'cimb': 'cimb-niaga',
  'cimb niaga': 'cimb-niaga',
  'bank cimb niaga': 'cimb-niaga',
  '022': 'cimb-niaga',
  'permata': 'permata',
  'bank permata': 'permata',
  'permata bank': 'permata',
  '013': 'permata',
  'danamon': 'danamon',
  'bank danamon': 'danamon',
  '011': 'danamon',
  'btn': 'btn',
  'bank btn': 'btn',
  'bank tabungan negara': 'btn',
  '200': 'btn',
  'seabank': 'seabank',
  'sea bank': 'seabank',
  'bank seabank': 'seabank',
  '535': 'seabank',
  'jago': 'jago',
  'bank jago': 'jago',
  'artos': 'jago',
  '542': 'jago',
  'blu': 'blu-bca',
  'blu bca': 'blu-bca',
  'blu by bca digital': 'blu-bca',
  'bca digital': 'blu-bca',
  '501': 'blu-bca',
  'jenius': 'jenius',
  'btpn': 'jenius',
  'bank btpn': 'jenius',
  '213': 'jenius',
  'neobank': 'neobank',
  'neo bank': 'neobank',
  'bnc': 'neobank',
  'bank neo commerce': 'neobank',
  '490': 'neobank',
  'bjb': 'bank-bjb',
  'bank bjb': 'bank-bjb',
  '110': 'bank-bjb',
  'jatim': 'bank-jatim',
  'bank jatim': 'bank-jatim',
  '114': 'bank-jatim',
  'jateng': 'bank-jateng',
  'bank jateng': 'bank-jateng',
  '113': 'bank-jateng',
  'sinarmas': 'sinarmas',
  'bank sinarmas': 'sinarmas',
  '153': 'sinarmas',
  'panin': 'paninbank',
  'panin bank': 'paninbank',
  'bank panin': 'paninbank',
  '019': 'paninbank',
  'superbank': 'superbank',
  'fama': 'superbank',
  '567': 'superbank',

  // E-Wallets & QR
  'qris': 'qris',
  'qris cpm': 'qris',
  'qris mpm': 'qris',
  'gopay': 'gopay',
  'go-pay': 'gopay',
  'gojek': 'gopay',
  'ovo': 'ovo',
  'dana': 'dana',
  'dompet dana': 'dana',
  'shopeepay': 'shopee-pay',
  'shopee pay': 'shopee-pay',
  'linkaja': 'linkaja',
  'link aja': 'linkaja',
  'astrapay': 'astrapay',
  'astra pay': 'astrapay',

  // Retail
  'indomaret': 'indomaret',
  'alfamart': 'alfamart',
  'alfamidi': 'alfamidi',

  // Gateways
  'midtrans': 'midtrans',
  'xendit': 'xendit',
  'doku': 'doku',
};

// Set lokal yang pasti tersedia di /public/images/finlogos/
const LOCAL_FINLOGOS = new Set([
  'alfamart', 'alfamidi', 'astrapay', 'bank-bjb', 'bank-jateng', 'bank-jatim',
  'bca', 'blu-bca', 'bni', 'bri', 'bsi', 'btn', 'cimb-niaga', 'dana',
  'danamon', 'doku', 'gopay', 'indomaret', 'jago', 'jenius', 'linkaja',
  'mandiri', 'midtrans', 'neobank', 'ovo', 'paninbank', 'permata', 'qris',
  'seabank', 'shopee-pay', 'sinarmas', 'superbank', 'xendit'
]);

/**
 * Normalisasi query/nama brand menjadi slug resmi
 */
export function resolveBrandSlug(query: string): string {
  if (!query) return '';
  const clean = query
    .toLowerCase()
    .trim()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

  // 1. Direct match di alias
  if (SLUG_ALIASES[clean]) {
    return SLUG_ALIASES[clean];
  }

  // 2. Parsial / Substring match untuk variasi nama panjang (e.g. "PT Bank Central Asia Tbk")
  for (const [key, slug] of Object.entries(SLUG_ALIASES)) {
    if (clean.includes(key) && key.length >= 3) {
      return slug;
    }
  }

  // 3. Fallback: sanitize string menjadi kebab-case slug
  return clean.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Dapatkan metadata lengkap logo brand termasuk fallback local vs CDN
 */
export function getBrandLogoMeta(query: string): {
  slug: string;
  isLocal: boolean;
  src: string;
  displayName: string;
} {
  const slug = resolveBrandSlug(query);
  const isLocal = LOCAL_FINLOGOS.has(slug);

  const src = isLocal
    ? `/images/finlogos/${slug}.svg`
    : `https://cdn.jsdelivr.net/npm/idn-finlogos@2/dist/icons/${slug}.svg`;

  return {
    slug,
    isLocal,
    src,
    displayName: query.trim(),
  };
}
