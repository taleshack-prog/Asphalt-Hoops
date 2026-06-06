import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/users/count', async (_req, res: Response): Promise<void> => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM users');
    const today = await pool.query('SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE');
    const invite = await pool.query('SELECT COUNT(*) FROM users WHERE invited_by IS NOT NULL');
    res.json({ count: +total.rows[0].count, today: +today.rows[0].count, via_invite: +invite.rows[0].count });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/growth', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`SELECT TO_CHAR(d::date,'DD/MM') as label, COUNT(u.id) as count FROM generate_series(CURRENT_DATE-INTERVAL '13 days',CURRENT_DATE,'1 day') AS d LEFT JOIN users u ON u.created_at::date=d::date GROUP BY d ORDER BY d`);
    res.json({ days: r.rows.map(x=>({label:x.label,count:+x.count})) });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/inviters', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`SELECT u.name, u.invite_code, COUNT(i.id) as invited_count FROM users u JOIN users i ON i.invited_by=u.id GROUP BY u.id,u.name,u.invite_code ORDER BY invited_count DESC LIMIT 20`);
    res.json({ rows: r.rows });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/recent', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT id,name,email,invited_by,invite_code,created_at FROM users ORDER BY created_at DESC LIMIT 20');
    res.json({ rows: r.rows });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/all', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT id,name,email,invited_by,invite_code,created_at FROM users ORDER BY created_at DESC');
    res.json({ rows: r.rows });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/most-active', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`SELECT u.name, COUNT(mp.match_id) as match_count FROM users u JOIN match_players mp ON mp.user_id=u.id GROUP BY u.id,u.name ORDER BY match_count DESC LIMIT 10`);
    res.json({ rows: r.rows });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/users/tree', async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`WITH RECURSIVE tree AS (SELECT id,name,invite_code,invited_by,0 as level FROM users WHERE invited_by IS NULL UNION ALL SELECT u.id,u.name,u.invite_code,u.invited_by,t.level+1 FROM users u JOIN tree t ON u.invited_by=t.id WHERE t.level<5) SELECT t.*,COUNT(i.id) as invited_count FROM tree t LEFT JOIN users i ON i.invited_by=t.id GROUP BY t.id,t.name,t.invite_code,t.invited_by,t.level ORDER BY t.level,t.name LIMIT 100`);
    res.json({ rows: r.rows });
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) { res.status(403).json({error:'Não autorizado'}); return; }
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM chat_messages WHERE user_id=$1',[id]);
    await pool.query('DELETE FROM match_players WHERE user_id=$1',[id]);
    await pool.query('DELETE FROM matches WHERE created_by=$1',[id]);
    await pool.query('UPDATE users SET invited_by=NULL WHERE invited_by=$1',[id]);
    await pool.query('DELETE FROM users WHERE id=$1',[id]);
    res.json({message:'Usuário deletado'});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/matches/count', async (_req, res: Response): Promise<void> => {
  try { const r=await pool.query('SELECT COUNT(*) FROM matches'); res.json({count:+r.rows[0].count}); }
  catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/matches/modalities', async (_req, res: Response): Promise<void> => {
  try { const r=await pool.query('SELECT modality,COUNT(*) as count FROM matches GROUP BY modality ORDER BY count DESC'); res.json({rows:r.rows}); }
  catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/matches/all', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT m.id,c.name as court_name,m.modality,m.scheduled_at,m.max_players,(SELECT COUNT(*) FROM match_players WHERE match_id=m.id) as player_count FROM matches m JOIN courts c ON m.court_id=c.id ORDER BY m.scheduled_at DESC LIMIT 50`);
    res.json({rows:r.rows});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/courts/count', async (_req, res: Response): Promise<void> => {
  try { const r=await pool.query('SELECT COUNT(*) FROM courts'); res.json({count:+r.rows[0].count}); }
  catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/courts/top', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT c.name,COUNT(m.id) as match_count FROM courts c LEFT JOIN matches m ON m.court_id=c.id GROUP BY c.id,c.name ORDER BY match_count DESC LIMIT 10`);
    res.json({rows:r.rows});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/courts/heatmap', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT c.id,c.name,c.address,c.lat,c.lng,COUNT(m.id) as match_count FROM courts c LEFT JOIN matches m ON m.court_id=c.id GROUP BY c.id ORDER BY match_count DESC`);
    res.json({rows:r.rows});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/courts/user-added', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT c.name as court_name,u.name as added_by_name,c.created_at FROM courts c LEFT JOIN users u ON c.added_by=u.id WHERE c.added_by IS NOT NULL ORDER BY c.created_at DESC LIMIT 20`);
    res.json({rows:r.rows});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/courts/by-neighborhood', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT SPLIT_PART(c.address,'—',2) as neighborhood,COUNT(DISTINCT c.id) as court_count,COUNT(m.id) as match_count FROM courts c LEFT JOIN matches m ON m.court_id=c.id GROUP BY neighborhood ORDER BY match_count DESC LIMIT 20`);
    res.json({rows:r.rows.map(x=>({...x,neighborhood:(x.neighborhood||'Não informado').trim()}))});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/messages/count', async (_req, res: Response): Promise<void> => {
  try {
    const msgs=await pool.query('SELECT COUNT(*) FROM chat_messages');
    const groups=await pool.query('SELECT COUNT(*) FROM chat_groups');
    res.json({count:+msgs.rows[0].count,groups:+groups.rows[0].count});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

router.get('/messages/daily', async (_req, res: Response): Promise<void> => {
  try {
    const r=await pool.query(`SELECT TO_CHAR(d::date,'DD/MM') as date,COUNT(cm.id) as count FROM generate_series(CURRENT_DATE-INTERVAL '6 days',CURRENT_DATE,'1 day') AS d LEFT JOIN chat_messages cm ON cm.created_at::date=d::date GROUP BY d ORDER BY d`);
    res.json({rows:r.rows.map(x=>({date:x.date,count:+x.count}))});
  } catch { res.status(500).json({error:'Erro interno'}); }
});

export default router;
