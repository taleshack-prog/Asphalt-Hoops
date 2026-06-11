import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Tabela necessária:
// CREATE TABLE IF NOT EXISTS feedback (
//   id SERIAL PRIMARY KEY,
//   user_id INT REFERENCES users(id) ON DELETE SET NULL,
//   rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
//   comment TEXT,
//   anonymous BOOLEAN DEFAULT FALSE,
//   category VARCHAR(50) DEFAULT 'geral',
//   created_at TIMESTAMP DEFAULT NOW()
// );

// POST /api/feedback
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { rating, comment, anonymous, category } = req.body;
  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating de 1 a 5 obrigatório' }); return; }
  try {
    await pool.query(
      'INSERT INTO feedback (user_id, rating, comment, anonymous, category) VALUES ($1, $2, $3, $4, $5)',
      [anonymous ? null : req.userId, rating, comment || null, anonymous || false, category || 'geral']
    );
    res.status(201).json({ message: 'Feedback enviado! Obrigado 🏀' });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/feedback — admin
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) { res.status(403).json({ error: 'Não autorizado' }); return; }
  try {
    const result = await pool.query(
      `SELECT f.id, f.rating, f.comment, f.anonymous, f.category, f.created_at,
              CASE WHEN f.anonymous THEN 'Anônimo' ELSE u.name END as user_name
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC LIMIT 100`
    );
    const stats = await pool.query(
      `SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as total,
              COUNT(CASE WHEN rating=5 THEN 1 END) as five_star,
              COUNT(CASE WHEN rating>=4 THEN 1 END) as positive
       FROM feedback`
    );
    res.json({ feedback: result.rows, stats: stats.rows[0] });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
