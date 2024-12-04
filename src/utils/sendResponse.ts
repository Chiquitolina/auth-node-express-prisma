import { Response } from 'express';

export const sendResponse = (res: Response, status: number, message: string, data?: any) : Response => {
  return res.status(status).json({
    message,
    data: data || null,
  });
};