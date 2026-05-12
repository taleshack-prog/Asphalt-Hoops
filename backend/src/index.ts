import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { pool } from './db';

import authRoutes from './routes/auth';
import courtsRoutes from './routes/courts';
import matchesRoutes from './routes/matches';

const app = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/matches', matchesRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Socket.io — Chat por Partida ────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`);

  // Usuário entra na sala da partida
  socket.on('join_match_chat', (matchId: number) => {
    socket.join(`chat_${matchId}`);
    console.log(`👤 ${socket.id} entrou em chat_${matchId}`);
  });

  // Usuário sai da sala
  socket.on('leave_match_chat', (matchId: number) => {
    socket.leave(`chat_${matchId}`);
  });

  // Recebe mensagem e faz broadcast na sala
  socket.on('send_message', async (data: { matchId: number; userId: number; message: string }) => {
    if (!data.matchId || !data.userId || !data.message?.trim()) return;

    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (match_id, user_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, message, created_at`,
        [data.matchId, data.userId, data.message.trim()]
      );

      const userResult = await pool.query(
        'SELECT name FROM users WHERE id = $1',
        [data.userId]
      );

      const msg = {
        ...result.rows[0],
        name: userResult.rows[0]?.name ?? 'Anônimo',
        user_id: data.userId,
      };

      // Envia para todos na sala (incluindo remetente)
      io.to(`chat_${data.matchId}`).emit('new_message', msg);
    } catch (err) {
      console.error('Erro ao salvar mensagem:', err);
      socket.emit('error', { message: 'Falha ao enviar mensagem' });
    }
  });

  // Typing indicator
  socket.on('typing', (data: { matchId: number; userName: string }) => {
    socket.to(`chat_${data.matchId}`).emit('user_typing', { userName: data.userName });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket desconectado: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`🚀 Asphalt Hoops backend rodando na porta ${PORT}`);
});
