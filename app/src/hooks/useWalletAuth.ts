import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { buildMessage } from "@tuwaio/siwx-core";
import { createSolanaSiwxSigner } from "@tuwaio/siwx-solana";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cyphermed.onrender.com";

// CAIP-2 chain ID of Solana devnet: the backend accepts sign-in messages for this cluster only
const DEVNET_CHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

// The signed message, and the session it opens, stay valid for at most 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const LOGOUT_FAILED =
  "We couldn't confirm that your session ended on the server, so you're still signed in. Check your connection and try again.";

// Ends the session on the server, retrying once. A 401 means it already expired or was revoked.
async function endServerSession(accessToken: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return true;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return true;
      if (attempt === 0)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

export function useWalletAuth() {
  const wallet = useWallet();
  const { setWallet, setTokens, setLoading, setError, logout } = useAuthStore();
  const clearProfile = useUserStore((state) => state.clearProfile);

  // Signs in and returns the role the server has on record for the wallet, or null when sign-in failed
  const signAndVerify = useCallback(async (): Promise<string | null> => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const address = wallet.publicKey.toBase58();

      // 1. Get a single-use nonce from backend
      const nonceRes = await axios.post(`${API_BASE_URL}/api/auth/nonce`);

      if (!nonceRes.data.nonce) {
        throw new Error("No nonce received from server");
      }

      // 2. Sign a SIWX (CAIP-122) message bound to this site, devnet and an expiry
      const issuedAt = new Date();
      const message = buildMessage({
        domain: window.location.host,
        address: `${DEVNET_CHAIN_ID}:${address}`,
        statement:
          "Sign in to CypherMed. This does not send a transaction or cost any fees.",
        uri: window.location.origin,
        version: "1",
        chainId: DEVNET_CHAIN_ID,
        nonce: nonceRes.data.nonce,
        issuedAt: issuedAt.toISOString(),
        expirationTime: new Date(
          issuedAt.getTime() + SESSION_TTL_MS
        ).toISOString(),
      });
      const signature = await createSolanaSiwxSigner({
        signMessage: wallet.signMessage,
      })(message);

      // 3. Verify the message and signature on backend
      const verifyRes = await axios.post(
        `${API_BASE_URL}/api/auth/verify-signature`,
        { message, signature }
      );

      if (verifyRes.data.accessToken) {
        setWallet(address);
        setTokens(verifyRes.data.accessToken, verifyRes.data.refreshToken);
        setLoading(false);
        return (verifyRes.data.user?.role as string | undefined) ?? "patient";
      } else {
        throw new Error("Verification failed");
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Authentication failed";
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  }, [wallet, setWallet, setTokens, setLoading, setError]);

  // Disconnects fully, in this order: the backend session (so its tokens stop working everywhere), then the
  // wallet, then the local tokens and profile. Clearing the profile while the wallet is still connected would
  // send /connect to the role step for a wallet that is about to disconnect. If the server can't confirm that
  // the session ended, nothing is cleared and the error is returned: the patient's access has not ended yet.
  const handleLogout = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && !(await endServerSession(accessToken))) {
      return { ok: false, error: LOGOUT_FAILED };
    }
    if (wallet.disconnect) {
      await wallet.disconnect().catch(() => undefined);
    }
    logout();
    clearProfile();
    return { ok: true };
  }, [wallet, logout, clearProfile]);

  return {
    signAndVerify,
    logout: handleLogout,
    isConnected: !!wallet.publicKey,
    walletAddress: wallet.publicKey?.toBase58(),
  };
}
