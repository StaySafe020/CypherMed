import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifySignature, generateNonce } from '../utils/wallet';
import prisma from '../prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// Store nonces temporarily (in production, use Redis)
const nonceStore = new Map<string, { nonce: string; timestamp: number }>();

/**
 * Generate a nonce for the user to sign
 */
router.post('/nonce', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    // Validate Solana address format (44 characters, base58)
    if (!/^[1-9A-HJ-NP-Z]{44}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Solana wallet address' });
    }

    // Generate nonce
    const nonce = generateNonce();

    // Store nonce (expires in 10 minutes)
    nonceStore.set(walletAddress, {
      nonce,
      timestamp: Date.now(),
    });

    // Clean up old nonces (older than 30 minutes)
    for (const [key, value] of nonceStore.entries()) {
      if (Date.now() - value.timestamp > 30 * 60 * 1000) {
        nonceStore.delete(key);
      }
    }

    res.json({ nonce });
  } catch (err: any) {
    console.error('Nonce generation error:', err);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * Verify signed message and issue JWT token
 */
router.post('/verify-signature', async (req: Request, res: Response) => {
  try {
    const { walletAddress, nonce, signature } = req.body;

    if (!walletAddress || !nonce || !signature) {
      return res.status(400).json({ error: 'walletAddress, nonce, and signature are required' });
    }

    // Get stored nonce
    const storedNonce = nonceStore.get(walletAddress);
    if (!storedNonce) {
      return res.status(400).json({ error: 'Nonce not found or expired' });
    }

    // Check nonce expiry (10 minutes)
    if (Date.now() - storedNonce.timestamp > 10 * 60 * 1000) {
      nonceStore.delete(walletAddress);
      return res.status(400).json({ error: 'Nonce expired' });
    }

    // Verify nonce matches
    if (storedNonce.nonce !== nonce) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }

    // Verify signature
    const isValid = verifySignature(nonce, signature, walletAddress);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Remove used nonce
    nonceStore.delete(walletAddress);

    // Create or get user
    let user = await prisma.patient.findUnique({
      where: { wallet: walletAddress },
    });

    if (!user) {
      // Create new patient with wallet
      user = await prisma.patient.create({
        data: {
          wallet: walletAddress,
          name: `User ${walletAddress.substring(0, 8)}`,
          dob: new Date(),
        },
      });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        walletAddress,
        role: 'patient',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        walletAddress,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        wallet: user.wallet,
        name: user.name,
      },
    });
  } catch (err: any) {
    console.error('Signature verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Refresh access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        walletAddress: decoded.walletAddress,
        role: 'patient',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ accessToken });
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * Middleware to verify JWT token
 */
export function verifyToken(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default router;
