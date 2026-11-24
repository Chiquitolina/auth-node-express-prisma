import { NextFunction, Request, Response } from 'express';

// Proteccion basica para un unico proceso. Si se escala a varias replicas,
// reemplazar por un limitador compartido (Redis o equivalente).
export function rateLimit(max: number, windowMs: number, keyFn?: (req: Request) => string) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size > 10000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }
    const key = keyFn?.(req) || req.ip || 'unknown';
    let item = buckets.get(key);
    if (!item || now >= item.resetAt) item = { count: 0, resetAt: now + windowMs };
    item.count++;
    buckets.set(key, item);
    if (item.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((item.resetAt - now) / 1000))));
      res.status(429).json({ message: 'Too many requests; try again later', data: null });
      return;
    }
    next();
  };
}
