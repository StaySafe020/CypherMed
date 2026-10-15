import type { NextFunction, Request, Response } from "express";

/**
 * A fixed-window rate limit per client IP, kept in memory: each window of `windowMs` allows `max` requests, then the
 * client gets 429 with Retry-After until the window ends. Behind a proxy, set Express `trust proxy` (TRUST_PROXY_HOPS)
 * so that `req.ip` is the client and not the proxy.
 */
export function createRateLimiter({
  windowMs,
  max,
  now = Date.now,
}: {
  windowMs: number;
  max: number;
  now?: () => number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const time = now();
    if (windows.size > 10_000) {
      for (const [key, window] of windows) {
        if (window.resetAt <= time) windows.delete(key);
      }
    }
    const key = req.ip ?? "unknown";
    let window = windows.get(key);
    if (!window || window.resetAt <= time) {
      window = { count: 0, resetAt: time + windowMs };
      windows.set(key, window);
    }
    window.count += 1;
    if (window.count > max) {
      const retryAfter = Math.ceil((window.resetAt - time) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: `Too many sign-in requests, try again in ${retryAfter} s`,
      });
    }
    next();
  };
}
