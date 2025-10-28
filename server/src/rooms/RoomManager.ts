import { ParticipantPayload, ParticipantRecord, RoomState } from '../types';

export class RoomManager {
  private readonly rooms = new Map<string, Map<string, ParticipantRecord>>();
  private readonly socketIndex = new Map<string, { roomName: string; participantId: string }>();

  upsertParticipant(roomName: string, participant: ParticipantPayload, socketId: string): RoomState {
    const room = this.getOrCreateRoom(roomName);

    room.set(participant.id, {
      ...participant,
      files: Array.isArray(participant.files) ? participant.files : [],
      socketId
    });

    this.socketIndex.set(socketId, { roomName, participantId: participant.id });

    return this.buildRoomState(roomName);
  }

  removeBySocket(socketId: string): RoomState | null {
    const mapping = this.socketIndex.get(socketId);
    if (!mapping) {
      return null;
    }

    const room = this.rooms.get(mapping.roomName);
    if (!room) {
      this.socketIndex.delete(socketId);
      return null;
    }

    room.delete(mapping.participantId);
    this.socketIndex.delete(socketId);

    if (room.size === 0) {
      this.rooms.delete(mapping.roomName);
    }

    return this.rooms.has(mapping.roomName)
      ? this.buildRoomState(mapping.roomName)
      : { roomName: mapping.roomName, participants: [] };
  }

  clearStaleEntries(roomName: string, maxAgeMs: number): RoomState {
    const room = this.rooms.get(roomName);
    if (!room) {
      return { roomName, participants: [] };
    }

    const threshold = Date.now() - maxAgeMs;

    for (const [participantId, record] of room.entries()) {
      if (record.lastUpdated < threshold) {
        room.delete(participantId);
        this.socketIndex.delete(record.socketId);
      }
    }

    if (room.size === 0) {
      this.rooms.delete(roomName);
      return { roomName, participants: [] };
    }

    return this.buildRoomState(roomName);
  }

  buildRoomState(roomName: string): RoomState {
    const room = this.rooms.get(roomName);
    if (!room) {
      return { roomName, participants: [] };
    }

    const participants = Array.from(room.values())
      .map<ParticipantPayload>(({ socketId: _socketId, ...rest }) => rest)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    return { roomName, participants };
  }

  private getOrCreateRoom(roomName: string): Map<string, ParticipantRecord> {
    const existing = this.rooms.get(roomName);
    if (existing) {
      return existing;
    }

    const room = new Map<string, ParticipantRecord>();
    this.rooms.set(roomName, room);
    return room;
  }
}
