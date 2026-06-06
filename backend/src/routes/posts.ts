import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/posts — público
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, title, content, author, created_at FROM posts WHERE published = TRUE ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/posts/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1 AND published = TRUE', [req.params.id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Post não encontrado' }); return; }
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/posts — admin only (verifica header secreto)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Não autorizado' }); return;
  }
  const { title, content, author } = req.body;
  if (!title || !content) { res.status(400).json({ error: 'title e content obrigatórios' }); return; }
  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3) RETURNING *',
      [title, content, author || 'Asphalt Hoops']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/posts/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Não autorizado' }); return;
  }
  const { title, content, author, published } = req.body;
  try {
    const result = await pool.query(
      'UPDATE posts SET title=$1, content=$2, author=$3, published=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [title, content, author, published, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/posts/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Não autorizado' }); return;
  }
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deletado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
