import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/courts — lista todas as quadras
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM courts ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/courts/:id — detalhe da quadra + partidas futuras
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const court = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id]);
    if (!court.rows[0]) {
      res.status(404).json({ error: 'Quadra não encontrada' });
      return;
    }

    const matches = await pool.query(
      `SELECT m.*, u.name as creator_name,
              (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) as player_count
       FROM matches m
       JOIN users u ON m.created_by = u.id
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
