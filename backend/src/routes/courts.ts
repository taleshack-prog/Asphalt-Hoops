import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/courts/with-matches — quadras com contagem de jogos futuros
router.get('/with-matches', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COUNT(m.id) FILTER (WHERE m.scheduled_at > NOW()) as match_count
      FROM courts c
      LEFT JOIN matches m ON m.court_id = c.id
      GROUP BY c.id
      ORDER BY match_count DESC, c.name ASC
    `);
    res.json(result.rows.map(r => ({ ...r, match_count: parseInt(r.match_count) || 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/courts
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM courts ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/courts
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, address, city, lat, lng } = req.body;
  if (!name || !lat || !lng) {
    res.status(400).json({ error: 'name, lat e lng são obrigatórios' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO courts (name, address, city, lat, lng, added_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, address || '', city || 'Porto Alegre', lat, lng, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/courts/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const court = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id]);
    if (!court.rows[0]) { res.status(404).json({ error: 'Quadra não encontrada' }); return; }
    const matches = await pool.query(
      `SELECT m.*, u.name as creator_name,
              (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) as player_count
       FROM matches m JOIN users u ON m.created_by = u.id
       WHERE m.court_id = $1 AND m.scheduled_at > NOW()
       ORDER BY m.scheduled_at`,
      [req.params.id]
    );
    res.json({ court: court.rows[0], upcoming_matches: matches.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
