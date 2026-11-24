import { Response } from 'express';

export function sendResponse(res: Response, status: number, message: string, data: unknown = null): Response {
  return res.status(status).json({ message, data });
}
