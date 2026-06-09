import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/health/full — verifica todos os serviços
router.get('/full', async (_req: Request, res: Response): Promise<void> => {
  const results: any = { timestamp: new Date().toISOString(), services: {} };

  // 1. Backend
  results.services.backend = { name: 'Backend Railway', status: 'ok', ms: 0 };

  // 2. PostgreSQL
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    results.services.database = { name: 'PostgreSQL', status: 'ok', ms: Date.now() - dbStart };
  } catch {
    results.services.database = { name: 'PostgreSQL', status: 'error', ms: Date.now() - dbStart, error: 'Conexão falhou' };
  }

  // 3. Oscar IA (Anthropic)
  const oscarStart = Date.now();
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      results.services.oscar = { name: 'Oscar IA (Anthropic)', status: 'error', ms: 0, error: 'ANTHROPIC_API_KEY não configurada' };
    } else {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'oi' }] }),
        signal: AbortSignal.timeout(5000),
      });
      const d = await r.json() as any;
      if (d.error) {
        results.services.oscar = { name: 'Oscar IA (Anthropic)', status: 'error', ms: Date.now() - oscarStart, error: d.error.message };
      } else {
        results.services.oscar = { name: 'Oscar IA (Anthropic)', status: 'ok', ms: Date.now() - oscarStart };
      }
    }
  } catch (e: any) {
    results.services.oscar = { name: 'Oscar IA (Anthropic)', status: 'error', ms: Date.now() - oscarStart, error: e.message };
  }

  // 4. Nominatim/Geocode
  const geoStart = Date.now();
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?q=Porto+Alegre&format=json&limit=1', {
      headers: { 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json() as any[];
    results.services.geocode = { name: 'Geocode (Nominatim)', status: d.length > 0 ? 'ok' : 'warning', ms: Date.now() - geoStart };
  } catch (e: any) {
    results.services.geocode = { name: 'Geocode (Nominatim)', status: 'error', ms: Date.now() - geoStart, error: e.message };
  }

  // 5. Cloudinary
  const cloudStart = Date.now();
  try {
    const r = await fetch(`https://res.cloudinary.com/df81p21ip/image/upload/asphalt-hoops`, {
      signal: AbortSignal.timeout(5000),
    });
    results.services.cloudinary = { name: 'Cloudinary (Fotos)', status: r.status < 500 ? 'ok' : 'error', ms: Date.now() - cloudStart };
  } catch (e: any) {
    results.services.cloudinary = { name: 'Cloudinary (Fotos)', status: 'error', ms: Date.now() - cloudStart, error: e.message };
  }

  // 6. PWA Vercel
  const pwaStart = Date.now();
  try {
    const r = await fetch('https://asphalt-hoops-pwa.vercel.app/manifest.json', {
      signal: AbortSignal.timeout(5000),
    });
    results.services.pwa = { name: 'PWA (Vercel)', status: r.ok ? 'ok' : 'error', ms: Date.now() - pwaStart };
  } catch (e: any) {
    results.services.pwa = { name: 'PWA (Vercel)', status: 'error', ms: Date.now() - pwaStart, error: e.message };
  }

  // Stats rápidos
  try {
    const [users, matches, msgs] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM matches'),
      pool.query('SELECT COUNT(*) FROM chat_messages'),
    ]);
    results.stats = {
      users: +users.rows[0].count,
      matches: +matches.rows[0].count,
      messages: +msgs.rows[0].count,
    };
  } catch {}

  // Status geral
  const statuses = Object.values(results.services).map((s: any) => s.status);
  results.overall = statuses.includes('error') ? 'degraded' : statuses.includes('warning') ? 'warning' : 'healthy';

  res.json(results);
});

export default router;
