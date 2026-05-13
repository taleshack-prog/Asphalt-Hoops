import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://asphalt-hoops-production.up.railway.app'; // troque pelo IP do backend em produção

let socket: Socket | null = null;

export function connectSocket(userId: number): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('🔌 Socket conectado'));
  socket.on('disconnect', () => console.log('🔌 Socket desconectado'));

  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket não inicializado — chame connectSocket() primeiro');
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
