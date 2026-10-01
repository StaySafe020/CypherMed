'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const WalletProvider = dynamic(
  () => import('@/providers/WalletProvider').then((module) => module.WalletProvider),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsWallet = pathname === '/connect'
    || pathname === '/login'
    || pathname === '/dashboard/patient'
    || pathname === '/dashboard/provider'
    || pathname === '/settings';

  return needsWallet ? <WalletProvider>{children}</WalletProvider> : children;
}
