import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panduan & Dokumentasi | EugineBill',
  description: 'Panduan setup awal dan integrasi sistem EugineBill ISP & RTRW.Net',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
