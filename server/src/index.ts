import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms/RoomManager';
import { ParticipantPayload, RoomState } from './types';

const PORT = Number(process.env.PORT ?? 4100);
const app = express();

app.use(cors());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  const roomName = extractRoomName(socket);
  if (!roomName) {
    socket.emit('room:error', { message: 'Room name required to join.' });
    socket.disconnect(true);
    return;
  }

  socket.join(roomName);
  console.log(`[socket] Client ${socket.id} joined room ${roomName}`);

  const initialState = roomManager.buildRoomState(roomName);
  socket.emit('room:state', initialState);

  socket.on('room:update', (payload: { roomName?: string; participant?: ParticipantPayload }) => {
    if (!payload || payload.roomName !== roomName) {
      return;
    }

    const participant = sanitizeParticipant(
      payload.participant,
      socket
    );

    if (!participant) {
      return;
    }

    const updatedState = roomManager.upsertParticipant(roomName, participant, socket.id);
    broadcastState(roomName, updatedState);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] Client ${socket.id} disconnected (${reason}).`);
    const state = roomManager.removeBySocket(socket.id);
    if (state) {
      broadcastState(roomName, state);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Git Room server listening on port ${PORT}`);
});

function broadcastState(roomName: string, state: RoomState): void {
  io.to(roomName).emit('room:state', state);
}

function sanitizeParticipant(
  participant: ParticipantPayload | undefined,
  socket: Socket
): ParticipantPayload | null {
  if (!participant || typeof participant.id !== 'string') {
    return null;
  }

  const files = Array.isArray(participant.files)
    ? participant.files.filter((entry) => typeof entry === 'string')
    : [];

  const fallbackUsername = resolveHandshakeUsername(socket);
  const anonymousFlag =
    typeof participant.anonymous === 'boolean'
      ? participant.anonymous
      : resolveHandshakeAnonymous(socket);

  return {
    id: participant.id,
    username: anonymousFlag ? 'Anonymous' : participant.username || fallbackUsername || 'Unknown',
    files,
    lastUpdated: typeof participant.lastUpdated === 'number'
      ? participant.lastUpdated
      : Date.now(),
    anonymous: anonymousFlag
  };
}

function extractRoomName(socket: Socket): string {
  const authRoom = socket.handshake.auth?.room;
  const queryRoom = socket.handshake.query?.room;
  const rawRoom =
    typeof authRoom === 'string'
      ? authRoom
      : typeof queryRoom === 'string'
        ? queryRoom
        : undefined;
  return rawRoom?.trim() ?? '';
}

function resolveHandshakeUsername(socket: Socket): string {
  const authUsername = socket.handshake.auth?.username;
  if (typeof authUsername === 'string' && authUsername.trim()) {
    return authUsername.trim();
  }
  const queryUsername = socket.handshake.query?.username;
  if (typeof queryUsername === 'string' && queryUsername.trim()) {
    return queryUsername.trim();
  }
  return 'Unknown';
}

function resolveHandshakeAnonymous(socket: Socket): boolean {
  const authAnonymous = socket.handshake.auth?.anonymous;
  if (typeof authAnonymous === 'boolean') {
    return authAnonymous;
  }
  if (typeof authAnonymous === 'string') {
    return authAnonymous === 'true';
  }

  const queryAnonymous = socket.handshake.query?.anonymous;
  if (typeof queryAnonymous === 'string') {
    return queryAnonymous === 'true';
  }

  return false;
}
