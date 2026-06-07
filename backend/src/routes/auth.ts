import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function genInviteCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 10);
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, invite_code: inviteCode } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: 'name, email e password são obrigatórios' }); return; }
  try {
    const hash = await bcrypt.hash(password, 10);
    const code = genInviteCode();
    let invitedBy: number | null = null;
    if (inviteCode) {
      const inv = await pool.query('SELECT id FROM users WHERE invite_code = $1', [inviteCode]);
      if (inv.rows[0]) invitedBy = inv.rows[0].id;
    }
    const result = await pool.query(
      `INSERT INTO users (name, email, password, invite_code, invited_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, invite_code, nickname, whatsapp, neighborhood, avatar, avatar_url`,
      [name, email, hash, code, invitedBy]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err: any) {
    if (err.code === '23505') res.status(409).json({ error: 'Email já cadastrado' });
    else { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'email e password obrigatórios' }); return; }
  try {
    const result = await pool.query(
      'SELECT id, name, email, password, invite_code, nickname, whatsapp, neighborhood, avatar, avatar_url FROM users WHERE email = $1', [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }
    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.json({ token, user: safeUser });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/auth/profile — atualiza perfil
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, nickname, whatsapp, neighborhood, avatar, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), nickname=$2, whatsapp=$3, neighborhood=$4, avatar=$5, avatar_url=$6
       WHERE id=$7 RETURNING id, name, email, invite_code, nickname, whatsapp, neighborhood, avatar, avatar_url`,
      [name, nickname || null, whatsapp || null, neighborhood || null, avatar || '🏀', avatar_url || null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/auth/users — para dashboard
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, name, email, invite_code, nickname FROM users WHERE id != $1 ORDER BY name', [req.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/auth/players — lista pública de jogadores
router.get('/players', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.nickname, u.neighborhood, u.avatar, u.avatar_url, u.whatsapp, u.invite_code,
              COUNT(mp.match_id) as match_count
       FROM users u LEFT JOIN match_players mp ON mp.user_id = u.id
       WHERE u.id != $1
       GROUP BY u.id ORDER BY match_count DESC, u.name`,
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
