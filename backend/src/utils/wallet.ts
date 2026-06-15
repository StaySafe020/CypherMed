import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

/**
 * Verify a Solana wallet signature
 * @param message The original message that was signed
 * @param signature The base64-encoded signature
 * @param walletAddress The Solana wallet address that signed
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    // Decode signature from base64
    const signatureBytes = Buffer.from(signature, 'base64');
    
    // Get public key from wallet address
    const publicKey = new PublicKey(walletAddress);
    const publicKeyBytes = publicKey.toBytes();
    
    // Verify signature
    return nacl.sign.detached.verify(
      Buffer.from(message),
      signatureBytes,
      publicKeyBytes
    );
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Generate a random nonce for signing
 * @returns A random nonce string
 */
export function generateNonce(): string {
  return `cyphermed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
