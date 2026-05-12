import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/matches — cria partida
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { court_id, modality, scheduled_at, max_players } = req.body;

  if (!court_id || !scheduled_at) {
    res.status(400).json({ error: 'court_id e scheduled_at são obrigatórios' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO matches (court_id, created_by, modality, scheduled_at, max_players)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [court_id, req.userId, modality || '3x3', scheduled_at, max_players || 6]
    );

    const match = result.rows[0];

    // Criador entra automaticamente
    await pool.query(
      'INSERT INTO match_players (match_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [match.id, req.userId]
    );

    res.status(201).json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/matches/:id/join — entrar na partida
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const matchId = parseInt(req.params.id);

  try {
    const match = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (!match.rows[0]) {
      res.status(404).json({ error: 'Partida não encontrada' });
      return;
    }

    const playerCount = await pool.query(
      'SELECT COUNT(*) FROM match_players WHERE match_id = $1',
      [matchId]
    );

    if (parseInt(playerCount.rows[0].count) >= match.rows[0].max_players) {
      res.status(400).json({ error: 'Partida cheia' });
      return;
    }

    await pool.query(
      'INSERT INTO match_players (match_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [matchId, req.userId]
    );

    res.json({ message: 'Entrou na partida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/matches/:id — detalhe da partida + jogadores + mensagens
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const matchId = req.params.id;

  try {
    const match = await pool.query(
      `SELECT m.*, c.name as court_name, c.lat, c.lng, u.name as creator_name
       FROM matches m
       JOIN courts c ON m.court_id = c.id
       JOIN users u ON m.created_by = u.id
       WHERE m.id = $1`,
      [matchId]
    );

    if (!match.rows[0]) {
      res.status(404).json({ error: 'Partida não encontrada' });
      return;
    }

    const players = await pool.query(
      `SELECT u.id, u.name FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    const messages = await pool.query(
      `SELECT cm.id, cm.message, cm.created_at, u.name
       FROM chat_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.match_id = $1
       ORDER BY cm.created_at ASC
       LIMIT 100`,
      [matchId]
    );

    res.json({
      match: match.rows[0],
      players: players.rows,
      messages: messages.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
