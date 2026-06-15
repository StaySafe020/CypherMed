import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useWalletAuth() {
  const wallet = useWallet();
  const { setWallet, setTokens, setLoading, setError, logout } = useAuthStore();

  const signAndVerify = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const address = wallet.publicKey.toBase58();
      
      // 1. Get a nonce from backend
      const nonceRes = await axios.post(`${API_BASE_URL}/api/auth/nonce`, {
        walletAddress: address,
      });

      if (!nonceRes.data.nonce) {
        throw new Error('No nonce received from server');
      }

      const nonce = nonceRes.data.nonce;

      // 2. Sign the nonce with wallet
      const message = new TextEncoder().encode(nonce);
      const signedMessage = await wallet.signMessage(message);
      
      if (!signedMessage) {
        throw new Error('Failed to sign message');
      }

      // 3. Verify signature on backend
      const verifyRes = await axios.post(
        `${API_BASE_URL}/api/auth/verify-signature`,
        {
          walletAddress: address,
          nonce,
          signature: Buffer.from(signedMessage).toString('base64'),
        }
      );

      if (verifyRes.data.accessToken) {
        setWallet(address);
        setTokens(verifyRes.data.accessToken, verifyRes.data.refreshToken);
        setLoading(false);
        return true;
      } else {
        throw new Error('Verification failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Authentication failed';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [wallet, setWallet, setTokens, setLoading, setError]);

  const handleLogout = useCallback(async () => {
    if (wallet.disconnect) {
      await wallet.disconnect();
    }
    logout();
  }, [wallet, logout]);

  return {
    signAndVerify,
    logout: handleLogout,
    isConnected: !!wallet.publicKey,
    walletAddress: wallet.publicKey?.toBase58(),
  };
}
