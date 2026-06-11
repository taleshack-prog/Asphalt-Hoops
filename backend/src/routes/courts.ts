import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/courts — lista todas as quadras
router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM courts ORDER BY name');
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/courts/with-matches — quadras com contagem de jogos futuros
router.get('/with-matches', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(m.id) as match_count
       FROM courts c
       LEFT JOIN matches m ON m.court_id = c.id AND m.scheduled_at > NOW()
       GROUP BY c.id ORDER BY c.name`
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/courts/:id — quadra com jogos futuros e lista de confirmados
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const court = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id]);
    if (!court.rows[0]) { res.status(404).json({ error: 'Quadra não encontrada' }); return; }

    const matches = await pool.query(
      `SELECT m.id, m.modality, m.scheduled_at, m.max_players,
              u.name as creator_name,
              (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) as player_count
       FROM matches m JOIN users u ON u.id = m.created_by
       WHERE m.court_id = $1 AND m.scheduled_at > NOW()
       ORDER BY m.scheduled_at ASC`,
      [req.params.id]
    );

    // Para cada jogo, busca lista de confirmados
    const matchesWithPlayers = await Promise.all(matches.rows.map(async (m) => {
      const players = await pool.query(
        `SELECT u.id, u.name, u.nickname, u.avatar, u.avatar_url
         FROM match_players mp JOIN users u ON u.id = mp.user_id
         WHERE mp.match_id = $1`,
        [m.id]
      );
      return { ...m, players: players.rows };
    }));

    res.json({ court: court.rows[0], upcoming_matches: matchesWithPlayers });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/courts — adicionar quadra
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, address, city, lat, lng } = req.body;
  if (!name || !lat || !lng) { res.status(400).json({ error: 'name, lat e lng obrigatórios' }); return; }
  try {
    const result = await pool.query(
      'INSERT INTO courts (name, address, city, lat, lng, added_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, address || '', city || 'Porto Alegre', lat, lng, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
