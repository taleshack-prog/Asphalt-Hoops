import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/messages/private/:userId — histórico com um usuário
router.get('/private/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT pm.id, pm.message, pm.created_at, pm.from_user as user_id,
              u.name, u.nickname, u.avatar, u.avatar_url
       FROM private_messages pm
       JOIN users u ON u.id = pm.from_user
       WHERE (pm.from_user = $1 AND pm.to_user = $2)
          OR (pm.from_user = $2 AND pm.to_user = $1)
       ORDER BY pm.created_at ASC LIMIT 100`,
      [req.userId, req.params.userId]
    );
    // Marca como lidas
    await pool.query(
      'UPDATE private_messages SET read = TRUE WHERE to_user = $1 AND from_user = $2',
      [req.userId, req.params.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/messages/private — envia msg privada
router.post('/private', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { to_user, message } = req.body;
  if (!to_user || !message?.trim()) { res.status(400).json({ error: 'to_user e message obrigatórios' }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO private_messages (from_user, to_user, message)
       VALUES ($1, $2, $3) RETURNING id, message, created_at, from_user as user_id`,
      [req.userId, to_user, message.trim()]
    );
    const user = await pool.query('SELECT name, nickname FROM users WHERE id = $1', [req.userId]);
    res.status(201).json({ ...result.rows[0], name: user.rows[0]?.nickname || user.rows[0]?.name });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/messages/notifications — notificações do usuário
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Msgs privadas não lidas
    const unreadMsgs = await pool.query(
      `SELECT pm.id, pm.message, pm.created_at, u.name, u.nickname, u.avatar, u.avatar_url, pm.from_user
       FROM private_messages pm JOIN users u ON u.id = pm.from_user
       WHERE pm.to_user = $1 AND pm.read = FALSE
       ORDER BY pm.created_at DESC LIMIT 20`,
      [req.userId]
    );
    // Jogos futuros que o usuário está inscrito
    const upcomingMatches = await pool.query(
      `SELECT m.id, m.scheduled_at, m.modality, c.name as court_name, u.name as creator_name
       FROM match_players mp
       JOIN matches m ON m.id = mp.match_id
       JOIN courts c ON c.id = m.court_id
       JOIN users u ON u.id = m.created_by
       WHERE mp.user_id = $1 AND m.scheduled_at > NOW()
       ORDER BY m.scheduled_at ASC LIMIT 5`,
      [req.userId]
    );
    res.json({
      unread_messages: unreadMsgs.rows,
      upcoming_matches: upcomingMatches.rows,
      unread_count: unreadMsgs.rows.length,
    });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
