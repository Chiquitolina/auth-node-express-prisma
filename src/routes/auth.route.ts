import { Router } from 'express';
import { login, register, sendVerificationCode, updateStatus } from '../controllers/auth.controller.ts';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.patch('/status', updateStatus);
authRouter.post('/get-code', sendVerificationCode)

export default authRouter;