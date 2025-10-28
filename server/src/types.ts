export interface ParticipantPayload {
  id: string;
  username: string;
  files: string[];
  lastUpdated: number;
  anonymous: boolean;
}

export interface ParticipantRecord extends ParticipantPayload {
  socketId: string;
}

export interface RoomState {
  roomName: string;
  participants: ParticipantPayload[];
}
