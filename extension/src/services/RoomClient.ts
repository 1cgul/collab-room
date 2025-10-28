import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { CollaboratorPresence, RoomClientOptions, RoomStatePayload } from '../types';
import { Logger } from '../util/logger';

const STATE_CHANGED_EVENT = 'stateChanged';
const CONNECTION_STATE_EVENT = 'connectionState';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export class RoomClient extends EventEmitter {
  private socket?: Socket;
  private readonly logger: Logger;
  private options: RoomClientOptions;
  private readonly localParticipantId: string;
  private participants: CollaboratorPresence[] = [];
  private connectionState: ConnectionState = 'disconnected';

  constructor(options: RoomClientOptions, logger: Logger) {
    super();
    this.options = options;
    this.logger = logger;
    this.localParticipantId = randomUUID();
  }

  connect(): void {
    if (!this.options.roomName) {
      this.logger.warn('Room name not configured. Skipping connection.');
      return;
    }

    if (this.socket) {
      if (this.socket.connected) {
        this.logger.debug('Socket already connected.');
        return;
      }
      this.socket.connect();
      return;
    }

    this.logger.info(`Connecting to Git Room server at ${this.options.serverUrl}`);
    this.setConnectionState('connecting');

    this.socket = io(this.options.serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: {
        room: this.options.roomName,
        username: this.options.username || 'Anonymous',
        anonymous: this.options.anonymousMode
      }
    });

    this.socket.on('connect', () => {
      this.logger.info('Connected to Git Room server.');
      this.setConnectionState('connected');
      this.sendLocalSnapshot();
    });

    this.socket.on('disconnect', (reason) => {
      this.logger.warn(`Disconnected from Git Room server (${reason}).`);
      this.setConnectionState('disconnected');
    });

    this.socket.on('connect_error', (err: Error) => {
      this.logger.error('Failed to connect to Git Room server.', err);
      this.setConnectionState('disconnected');
    });

    this.socket.on('room:state', (payload: RoomStatePayload) => {
      this.logger.debug('Received room state update from server.');
      this.mergeRemoteState(payload.participants);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
    }
    this.setConnectionState('disconnected');
  }

  updateOptions(options: RoomClientOptions): void {
    this.options = options;
    // Re-evaluate connection when settings change.
    this.disconnect();
    this.connect();
  }

  async publishLocalChanges(files: string[]): Promise<void> {
    const participant = this.createLocalParticipant(files);
    this.mergeRemoteState([participant]);

    if (this.socket?.connected) {
      this.socket.emit('room:update', {
        roomName: this.options.roomName,
        participant
      });
    }
  }

  onDidChangeState(listener: (participants: CollaboratorPresence[]) => void): () => void {
    this.on(STATE_CHANGED_EVENT, listener);
    return () => this.off(STATE_CHANGED_EVENT, listener);
  }

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    this.on(CONNECTION_STATE_EVENT, listener);
    return () => this.off(CONNECTION_STATE_EVENT, listener);
  }

  getLatestState(): CollaboratorPresence[] {
    return [...this.participants];
  }

  dispose(): void {
    this.disconnect();
    this.removeAllListeners();
  }

  private createLocalParticipant(files: string[]): CollaboratorPresence {
    return {
      id: this.localParticipantId,
      username: this.options.anonymousMode
        ? 'Anonymous'
        : this.options.username || 'Unknown',
      files,
      lastUpdated: Date.now(),
      isLocal: true,
      anonymous: this.options.anonymousMode
    };
  }

  private sendLocalSnapshot(): void {
    const existing = this.participants.find((p) => p.id === this.localParticipantId);
    if (existing && this.socket?.connected) {
      this.socket.emit('room:update', {
        roomName: this.options.roomName,
        participant: existing
      });
    }
  }

  private mergeRemoteState(remote: CollaboratorPresence[]): void {
    const byId = new Map<string, CollaboratorPresence>();
    [...this.participants, ...remote].forEach((participant) => {
      const current = byId.get(participant.id);
      if (!current || current.lastUpdated <= participant.lastUpdated) {
        const merged: CollaboratorPresence = {
          ...(current ?? participant),
          ...participant,
          isLocal: participant.isLocal ?? current?.isLocal ?? false
        };
        byId.set(participant.id, merged);
      }
    });

    this.participants = Array.from(byId.values()).sort(
      (a, b) => b.lastUpdated - a.lastUpdated
    );

    this.emit(STATE_CHANGED_EVENT, this.getLatestState());
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) {
      return;
    }
    this.connectionState = state;
    this.emit(CONNECTION_STATE_EVENT, state);
  }
}
