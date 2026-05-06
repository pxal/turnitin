import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  maxAttempts: number;
  windowMs: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

type Bucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || req.ip || "unknown";
  }

  return req.ip || "unknown";
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const keyPart = options.keyGenerator?.(req) || getClientIp(req);
    const key = `${options.keyPrefix}:${keyPart}`;
    const existing = buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      buckets.set(key, {
        count: 1,
        expiresAt: now + options.windowMs
      });

      return next();
    }

    if (existing.count >= options.maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));

      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        message: options.message,
        retryAfterSeconds
      });
    }

    existing.count += 1;
    buckets.set(key, existing);
    return next();
  };
}
