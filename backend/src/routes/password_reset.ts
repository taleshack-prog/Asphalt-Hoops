import { Router, Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();

// Tabela necessária:
// CREATE TABLE IF NOT EXISTS password_resets (
//   id SERIAL PRIMARY KEY,
//   user_id INT REFERENCES users(id) ON DELETE CASCADE,
//   token VARCHAR(64) UNIQUE NOT NULL,
//   expires_at TIMESTAMP NOT NULL,
//   used BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMP DEFAULT NOW()
// );

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email obrigatório' }); return; }
  try {
    const user = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    // Sempre retorna sucesso para não revelar se email existe
    if (!user.rows[0]) { res.json({ message: 'Se o email existir, você receberá as instruções.' }); return; }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [user.rows[0].id, token, expires]
    );

    const resetUrl = `https://asphalt-hoops-pwa.vercel.app/reset-password?token=${token}`;

    // Envia email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Asphalt Hoops <noreply@asphalthoops.app>',
        to: email,
        subject: '🏀 Recuperação de senha — Asphalt Hoops',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0A0A0A;color:#F0F0F0;padding:32px;border-radius:16px">
            <h1 style="color:#F97316;font-size:24px;margin-bottom:8px">🏀 Asphalt Hoops</h1>
            <p style="color:#888;font-size:13px;margin-bottom:24px">RECUPERAÇÃO DE SENHA</p>
            <p style="margin-bottom:16px">Olá, <strong>${user.rows[0].name}</strong>!</p>
            <p style="color:#aaa;margin-bottom:24px">Recebemos uma solicitação para redefinir a senha da tua conta. Clica no botão abaixo:</p>
            <a href="${resetUrl}" style="display:block;background:#F97316;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:700;font-size:16px;margin-bottom:24px">
              🔑 Redefinir minha senha
            </a>
            <p style="color:#555;font-size:12px;margin-bottom:8px">Este link expira em 1 hora.</p>
            <p style="color:#555;font-size:12px">Se não solicitaste isso, ignora este email.</p>
            <hr style="border-color:#1A1A1A;margin:24px 0"/>
            <p style="color:#333;font-size:11px;text-align:center">Hack Tech Farm — HTF | Heitor • Tales • Francisco</p>
          </div>
        `
      })
    });

    res.json({ message: 'Se o email existir, você receberá as instruções.' });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: 'Token e senha obrigatórios' }); return; }
  if (password.length < 6) { res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' }); return; }
  try {
    const reset = await pool.query(
      'SELECT * FROM password_resets WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (!reset.rows[0]) { res.status(400).json({ error: 'Link inválido ou expirado' }); return; }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, reset.rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
