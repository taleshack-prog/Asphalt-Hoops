import { Router, Response, Request } from 'express';
import { pool } from '../db';

const router = Router();

// Middleware simples — só verifica token JWT válido (qualquer usuário logado)
// O dashboard HTML já tem senha própria

// GET /api/dashboard/users/count
router.get('/users/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM users');
    const today = await pool.query(`SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE`);
    const via_invite = await pool.query('SELECT COUNT(*) FROM users WHERE invited_by IS NOT NULL');
    res.json({
      count: parseInt(total.rows[0].count),
      today: parseInt(today.rows[0].count),
      via_invite: parseInt(via_invite.rows[0].count),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/users/growth
router.get('/users/growth', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(d::date, 'DD/MM') as label,
        COUNT(u.id) as count
      FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'
      ) AS d
      LEFT JOIN users u ON u.created_at::date = d::date
      GROUP BY d ORDER BY d
    `);
    res.json({ days: result.rows.map(r => ({ label: r.label, count: parseInt(r.count) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/users/inviters
router.get('/users/inviters', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT u.name, COUNT(i.id) as invited_count
      FROM users u JOIN users i ON i.invited_by = u.id
      GROUP BY u.id, u.name
      ORDER BY invited_count DESC LIMIT 10
    `);
    res.json({ rows: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/users/recent
router.get('/users/recent', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, invited_by, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    res.json({ rows: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/matches/count
router.get('/matches/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM matches');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/matches/modalities
router.get('/matches/modalities', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT modality, COUNT(*) as count FROM matches
      GROUP BY modality ORDER BY count DESC
    `);
    res.json({ rows: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/courts/count
router.get('/courts/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM courts');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/courts/top
router.get('/courts/top', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT c.name, COUNT(m.id) as match_count
      FROM courts c LEFT JOIN matches m ON m.court_id = c.id
      GROUP BY c.id, c.name ORDER BY match_count DESC LIMIT 10
    `);
    res.json({ rows: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/courts/user-added
router.get('/courts/user-added', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT c.name as court_name, u.name as added_by_name, c.created_at
      FROM courts c LEFT JOIN users u ON c.added_by = u.id
      WHERE c.added_by IS NOT NULL
      ORDER BY c.created_at DESC LIMIT 20
    `);
    res.json({ rows: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/messages/count
router.get('/messages/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const msgs = await pool.query('SELECT COUNT(*) FROM chat_messages');
    const groups = await pool.query('SELECT COUNT(*) FROM chat_groups');
    res.json({
      count: parseInt(msgs.rows[0].count),
      groups: parseInt(groups.rows[0].count),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/messages/daily
router.get('/messages/daily', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(d::date, 'DD/MM') as date,
        COUNT(cm.id) as count
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'
      ) AS d
      LEFT JOIN chat_messages cm ON cm.created_at::date = d::date
      GROUP BY d ORDER BY d
    `);
    res.json({ rows: result.rows.map(r => ({ date: r.date, count: parseInt(r.count) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
