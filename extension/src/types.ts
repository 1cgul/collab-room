export interface CollaboratorPresence {
  id: string;
  username: string;
  files: string[];
  lastUpdated: number;
  isLocal: boolean;
  anonymous: boolean;
}

export interface RoomStatePayload {
  roomName: string;
  participants: CollaboratorPresence[];
}

export interface RoomClientOptions {
  serverUrl: string;
  roomName: string;
  username: string;
  anonymousMode: boolean;
}

export interface ExtensionSettings {
  roomName: string;
  username: string;
  serverUrl: string;
  refreshInterval: number;
  gitBranch: string;
  anonymousMode: boolean;
}
