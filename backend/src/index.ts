import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import { pool } from './db';

import authRoutes from './routes/auth';
import courtsRoutes from './routes/courts';
import matchesRoutes from './routes/matches';
import chatRoutes from './routes/chat';
import dashboardRoutes from './routes/dashboard';
import postsRoutes from './routes/posts';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Dashboard HTML estático
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/posts', postsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`🔌 ${socket.id} conectado`);

  socket.on('join_match_chat', (matchId: number) => { socket.join(`match_${matchId}`); });
  socket.on('leave_match_chat', (matchId: number) => { socket.leave(`match_${matchId}`); });

  socket.on('send_match_message', async (data: { matchId: number; userId: number; message: string }) => {
    if (!data.matchId || !data.userId || !data.message?.trim()) return;
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (match_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, message, created_at`,
        [data.matchId, data.userId, data.message.trim()]
      );
      const user = await pool.query('SELECT name FROM users WHERE id = $1', [data.userId]);
      io.to(`match_${data.matchId}`).emit('new_message', { ...result.rows[0], name: user.rows[0]?.name, user_id: data.userId });
    } catch (err) { console.error(err); }
  });

  socket.on('join_general', () => { socket.join('general'); });
  socket.on('send_general_message', async (data: { userId: number; message: string }) => {
    if (!data.userId || !data.message?.trim()) return;
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (user_id, message, is_general) VALUES ($1, $2, TRUE) RETURNING id, message, created_at`,
        [data.userId, data.message.trim()]
      );
      const user = await pool.query('SELECT name FROM users WHERE id = $1', [data.userId]);
      io.to('general').emit('new_general_message', { ...result.rows[0], name: user.rows[0]?.name, user_id: data.userId });
    } catch (err) { console.error(err); }
  });

  socket.on('join_group_chat', (groupId: number) => { socket.join(`group_${groupId}`); });
  socket.on('leave_group_chat', (groupId: number) => { socket.leave(`group_${groupId}`); });
  socket.on('send_group_message', async (data: { groupId: number; userId: number; message: string }) => {
    if (!data.groupId || !data.userId || !data.message?.trim()) return;
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (group_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, message, created_at`,
        [data.groupId, data.userId, data.message.trim()]
      );
      const user = await pool.query('SELECT name FROM users WHERE id = $1', [data.userId]);
      io.to(`group_${data.groupId}`).emit('new_group_message', { ...result.rows[0], name: user.rows[0]?.name, user_id: data.userId });
    } catch (err) { console.error(err); }
  });

  socket.on('typing', (data: { room: string; userName: string }) => {
    socket.to(data.room).emit('user_typing', { userName: data.userName });
  });

  socket.on('disconnect', () => { console.log(`🔌 ${socket.id} desconectado`); });
});

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`🚀 Asphalt Hoops backend rodando na porta ${PORT}`);
});
