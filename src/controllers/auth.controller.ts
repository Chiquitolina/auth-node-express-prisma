import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { sendResponse } from '../utils/sendResponse';
import { AuthenticatedRequest } from '../middleware/requireAuth';
import { sendVerificationEmail } from '../utils/nodeMailer';

const prisma = new PrismaClient();

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      sendResponse(res, 401, 'Invalid credentials');
      return;
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { last_login: new Date() } });
    const token = jwt.sign({ userId: updated.id }, process.env.JWT_SECRET as string, {
      algorithm: 'HS256', expiresIn: '1h',
    });
    res.status(200).json({
      message: 'Login successful',
      data: {
        token,
        user: {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
          status: updated.status,
          is_verified: updated.is_verified,
          last_login: updated.last_login,
        },
      },
    });
  } catch (error) {
    console.error('Login error', error);
    sendResponse(res, 500, 'Error logging in');
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, full_name, verification_code } = req.body as {
    email: string; password: string; full_name: string; verification_code: string;
  };
  try {
    const verificationRecord = await prisma.verificationCode.findUnique({ where: { email } });
    if (!verificationRecord || verificationRecord.expiresAt < new Date() ||
        !(await bcrypt.compare(verification_code, verificationRecord.code))) {
      sendResponse(res, 400, 'Invalid or expired verification code');
      return;
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      sendResponse(res, 409, 'Email is already in use');
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: { email, full_name, password: hashedPassword, is_verified: true },
      });
      await tx.verificationCode.deleteMany({ where: { email, code: verificationRecord.code } });
      return created;
    });
    sendResponse(res, 201, 'User created', {
      id: user.id, email: user.email, full_name: user.full_name,
      status: user.status, profile_picture: user.profile_picture,
      is_verified: user.is_verified, last_login: user.last_login,
      created_at: user.created_at, updated_at: user.updated_at,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      sendResponse(res, 409, 'Email is already in use');
      return;
    }
    console.error('Register error', error);
    sendResponse(res, 500, 'Error creating user');
  }
}

export async function sendVerificationCode(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      sendResponse(res, 409, 'Email is already in use');
      return;
    }
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      sendResponse(res, 503, 'Email service unavailable');
      return;
    }
    // Se conserva el OTP de 4 digitos porque el frontend V1 espera cuatro.
    const code = String(randomInt(1000, 10000));
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await prisma.verificationCode.upsert({
      where: { email },
      update: { code: hashedCode, expiresAt },
      create: { email, code: hashedCode, expiresAt },
    });
    await sendVerificationEmail(email, code);
    sendResponse(res, 200, 'Verification code sent');
  } catch (error) {
    console.error('Verification email error', error);
    sendResponse(res, 503, 'Unable to send verification code');
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.authUserId;
  const { status } = req.body as { status: 'online' | 'offline' | 'away' | 'busy' };
  if (!userId) {
    sendResponse(res, 401, 'Authentication required');
    return;
  }
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    sendResponse(res, 200, 'Status updated', {
      id: user.id, email: user.email, full_name: user.full_name,
      status: user.status, profile_picture: user.profile_picture,
      is_verified: user.is_verified, last_login: user.last_login,
      created_at: user.created_at, updated_at: user.updated_at,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      sendResponse(res, 404, 'User not found');
      return;
    }
    console.error('Status update error', error);
    sendResponse(res, 500, 'Error updating status');
  }
}
