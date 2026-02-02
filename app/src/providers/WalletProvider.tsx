'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Helius RPC endpoints for better reliability and performance
const HELIUS_RPC = {
  devnet: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
  mainnet: `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
};

export const WalletProvider: FC<Props> = ({ children }) => {
  // Use Helius RPC for enhanced reliability, rate limits, and developer tooling
  // Falls back to public devnet if no API key is set
  const endpoint = useMemo(() => {
    const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (heliusKey) {
      return HELIUS_RPC.devnet; // Switch to mainnet for production
    }
    // Fallback to public RPC (not recommended for production)
    console.warn('NEXT_PUBLIC_HELIUS_API_KEY not set. Using public RPC (rate limited).');
    return 'https://api.devnet.solana.com';
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
