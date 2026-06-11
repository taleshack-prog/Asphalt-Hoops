import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/matches — criar partida
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { court_id, modality, scheduled_at, max_players } = req.body;
  if (!court_id || !modality || !scheduled_at) { res.status(400).json({ error: 'court_id, modality e scheduled_at obrigatórios' }); return; }
  try {
    const result = await pool.query(
      'INSERT INTO matches (court_id, created_by, modality, scheduled_at, max_players) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [court_id, req.userId, modality, scheduled_at, max_players || 6]
    );
    const match = result.rows[0];
    // Criador entra automaticamente
    await pool.query('INSERT INTO match_players (match_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [match.id, req.userId]);
    res.status(201).json(match);
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/matches/:id/join — confirmar presença
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const matchId = Number(req.params.id);
  try {
    // Verifica se partida existe e não está lotada
    const match = await pool.query(
      `SELECT m.*, c.name as court_name,
              (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) as player_count
       FROM matches m JOIN courts c ON c.id = m.court_id
       WHERE m.id = $1`, [matchId]
    );
    if (!match.rows[0]) { res.status(404).json({ error: 'Partida não encontrada' }); return; }
    if (Number(match.rows[0].player_count) >= match.rows[0].max_players) {
      res.status(400).json({ error: 'Partida lotada' }); return;
    }

    await pool.query('INSERT INTO match_players (match_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [matchId, req.userId]);

    // Busca dados do usuário e contagem atualizada
    const userResult = await pool.query('SELECT name, nickname FROM users WHERE id = $1', [req.userId]);
    const countResult = await pool.query('SELECT COUNT(*) FROM match_players WHERE match_id = $1', [matchId]);
    const userName = userResult.rows[0]?.nickname || userResult.rows[0]?.name || 'Alguém';
    const playerCount = Number(countResult.rows[0].count);
    const maxPlayers = match.rows[0].max_players;

    // Notificação salva no DB — socket emite via index.ts ao salvar msg

    // Salva notificação para o criador da partida
    if (match.rows[0].created_by !== req.userId) {
      await pool.query(
        `INSERT INTO chat_messages (match_id, user_id, message, is_general)
         VALUES ($1, $2, $3, FALSE)`,
        [matchId, req.userId, `🏀 ${userName} confirmou presença! ${playerCount}/${maxPlayers} jogadores`]
      );
    }

    res.json({
      message: 'Presença confirmada!',
      player_count: playerCount,
      max_players: maxPlayers
    });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/matches/:id — busca partida com mensagens
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const msgs = await pool.query(
      `SELECT cm.id, cm.message, cm.created_at, u.name, u.id as user_id
       FROM chat_messages cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.match_id = $1 ORDER BY cm.created_at ASC LIMIT 100`,
      [req.params.id]
    );
    res.json({ messages: msgs.rows });
  } catch(e) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
