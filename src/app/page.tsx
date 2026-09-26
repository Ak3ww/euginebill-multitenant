import SaaSLandingPage from '@/app/saas/page';

// Root Apex Domain (euginemediagroup.site) serves the SaaS Landing Page & Pricing
// Tenant Subdomains (e.g. citranet.euginemediagroup.site) are rewritten by proxy.ts to /customer or /admin
export default function Home() {
  return <SaaSLandingPage />;
}
