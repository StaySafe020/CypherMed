import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // Auth tokens & session
  accessToken: string | null;
  refreshToken: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWallet: (address: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Helpers
  hasValidToken: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      walletAddress: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setWallet: (address) => set({ walletAddress: address }),

      setTokens: (accessToken, refreshToken) => set({
        accessToken,
        refreshToken: refreshToken || null,
        isAuthenticated: true,
        error: null,
      }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        walletAddress: null,
        isAuthenticated: false,
        error: null,
      }),

      hasValidToken: () => !!get().accessToken && get().isAuthenticated,
    }),
    {
      name: 'cyphermed-auth',
    }
  )
);
