import { Router } from 'express';
import { login, register, sendVerificationCode, updateStatus } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { EmailSchema, LoginSchema, RegisterSchema, UpdateStatusSchema } from '../schemas/auth.schemas';

const authRouter = Router();
const minute = 60_000;

// Limitadores en memoria (para una instancia PM2 en modo fork).
authRouter.post('/login', rateLimit(12, 15 * minute), validate(LoginSchema), login);
authRouter.post('/get-code',
  rateLimit(5, 15 * minute),
  validate(EmailSchema),
  rateLimit(1, minute, req => String(req.body.email)),
  sendVerificationCode,
);
authRouter.post('/register', rateLimit(10, 15 * minute), validate(RegisterSchema),
  rateLimit(5, 15 * minute, req => String(req.body.email)), register);
authRouter.patch('/status', requireAuth, validate(UpdateStatusSchema), updateStatus);

export default authRouter;
