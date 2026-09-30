'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FooterSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings/company');
  }, [router]);

  return null;
}
