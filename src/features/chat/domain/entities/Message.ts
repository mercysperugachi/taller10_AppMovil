export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: Date;
  authorUsername?: string;
  imageUrl?: string; // <-- NUEVO: URL de la imagen
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}