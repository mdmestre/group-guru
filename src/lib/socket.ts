import { io, Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: token ? { token } : undefined,
    });
  }

  return socket;
}

export function getRawSocket(): Socket | null {
  return socket;
}
