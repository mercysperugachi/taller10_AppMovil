// src/features/chat/domain/entities/Message.ts

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: Date;
  authorUsername?: string; // Desnormalización controlada para la UI
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}