import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.js';
import { publicRouter } from './server/routes/public.js';
import { dataRouter } from './server/routes/data.js';
import { platformRouter } from './server/routes/platform.js';
import { aiRouter } from './server/routes/ai.js';
import { requireAuth, requireCompany, requireRole } from './server/auth.js';
import { query } from './server/db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
  next();
});

// Avatars/selfies arrive as data URLs, so allow a few MB — but not 50.
app.use(express.json({ limit: '6mb' }));
app.use(express.text({ limit: '6mb', type: ['text/csv', 'text/plain'] }));

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ success: true, status: 'ok', database: 'connected' });
  } catch (err: any) {
    res.status(503).json({ success: false, status: 'degraded', database: 'unavailable' });
  }
});

// Public (no login)
app.use('/api', authRouter);
app.use('/api', publicRouter);

// Platform owner
app.use('/api', (req, res, next) => (req.path.startsWith('/platform') ? requireAuth(req, res, next) : next()));
app.use('/api', (req, res, next) => (req.path.startsWith('/platform') ? requireRole('platform_admin')(req, res, next) : next()));
app.use('/api', platformRouter);

// Company app (login + active company required)
app.use('/api', requireAuth, requireCompany);
app.use('/api', dataRouter);
app.use('/api', aiRouter);

app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Not found.' }));

// Central error handler — never leak internals to the browser.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'The uploaded data is too large.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid request body.' });
  }
  console.error('[api error]', err);
  res.status(500).json({ success: false, message: 'Something went wrong on our side. Please try again.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`[Attendra] API running on http://0.0.0.0:${PORT}`));
}

if (process.env.VERCEL !== '1' && process.env.ATTENDRA_NO_LISTEN !== '1') {
  startServer();
}

export default app;
