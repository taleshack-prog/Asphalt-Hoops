import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/chat/general
router.get('/general', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT cm.id, cm.message, cm.created_at, u.name, u.id as user_id
       FROM chat_messages cm JOIN users u ON cm.user_id = u.id
       WHERE cm.is_general = TRUE ORDER BY cm.created_at ASC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/chat/groups
router.get('/groups', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT cg.*, u.name as creator_name,
              (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.id) as member_count,
              EXISTS(SELECT 1 FROM chat_group_members WHERE group_id = cg.id AND user_id = $1) as is_member
       FROM chat_groups cg JOIN users u ON cg.created_by = u.id ORDER BY cg.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/chat/groups
router.post('/groups', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, members } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Nome do grupo obrigatório' }); return; }
  try {
    const group = await pool.query(
      'INSERT INTO chat_groups (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.userId]
    );
    const groupId = group.rows[0].id;
    // Criador entra automaticamente
    await pool.query('INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2)', [groupId, req.userId]);
    // Adiciona membros convidados
    if (Array.isArray(members) && members.length > 0) {
      for (const memberId of members) {
        await pool.query(
          'INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [groupId, memberId]
        );
      }
    }
    res.status(201).json(group.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/chat/groups/:id/join
router.post('/groups/:id/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(
      'INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Entrou no grupo' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/chat/groups/:id/messages
router.get('/groups/:id/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT cm.id, cm.message, cm.created_at, u.name, u.id as user_id
       FROM chat_messages cm JOIN users u ON cm.user_id = u.id
       WHERE cm.group_id = $1 ORDER BY cm.created_at ASC LIMIT 100`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
