'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { setupClipboardPolyfill } from '@/lib/clipboard';

export function ClientProviders({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setupClipboardPolyfill();
    setMounted(true);
  }, []);

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
      {mounted && (
        <>
          <Toaster />
          <PwaInstallPrompt />
        </>
      )}
    </SessionProvider>
  );
}
