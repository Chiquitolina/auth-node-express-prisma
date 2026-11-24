import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  authUserId?: number;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.header('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ message: 'Authentication required', data: null });
    return;
  }
  try {
    const payload: string | JwtPayload = jwt.verify(match[1], process.env.JWT_SECRET as string, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !Number.isInteger(payload.userId) || payload.userId <= 0) {
      throw new Error('Invalid token payload');
    }
    req.authUserId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token', data: null });
  }
}
