export enum UserRole {
  GM = 'MESTRE',
  PLAYER = 'JOGADOR'
}

export enum CharacterType {
  PC = 'PERSONAGEM',
  NPC = 'NPC'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string; // Agora opcional para suportar usuários antigos, mas obrigatório no novo fluxo
  avatar?: string;
}

export interface Attribute {
  name: string;
  value: number;
}

export interface Character {
  id: string;
  name: string;
  type: CharacterType;
  ownerId: string; // User ID
  systemId: string;
  description: string;
  attributes: Attribute[];
  hp: { current: number; max: number };
  san: { current: number; max: number }; // Sanity for Ordem Paranormal
}

export interface GameSystem {
  id: string;
  name: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

export interface Session {
  id: string;
  name: string;
  gmId: string;
  systemId: string;
  isActive: boolean;
  activeCharacterIds: string[];
  logs: ChatMessage[];
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  characters: Character[];
  sessions: Session[];
  activeSessionId: string | null;
  currentSystemId: string;
}