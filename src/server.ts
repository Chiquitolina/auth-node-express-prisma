import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth.route';

const PORT = Number(process.env.PORT ?? '3004');
const HOST = process.env.HOST?.trim() || '127.0.0.1';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT debe ser un puerto TCP valido');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio');
}

const app = express();
app.disable('x-powered-by');
// Nginx corre localmente; evita confiar en cabeceras proxy arbitrarias de Internet.
app.set('trust proxy', 'loopback');
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').map(v => v.trim()).filter(Boolean);
if (allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
}
app.use(express.json({ limit: '16kb' }));

app.get('/api/health-check', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Diagnostico de DB: usar solo localmente; Nginx no debe publicar esta ruta.
const db = new PrismaClient();
app.get('/api/health-check/db', async (_req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ database: 'ok' });
  } catch {
    res.status(503).json({ database: 'unavailable' });
  }
});

app.use('/api', authRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ message: 'Invalid JSON body', data: null });
    return;
  }
  console.error('Unhandled request error', err);
  res.status(500).json({ message: 'Internal server error', data: null });
});

app.listen(PORT, HOST, () => {
  console.log(`Auth Flow API listening on http://${HOST}:${PORT}`);
});
