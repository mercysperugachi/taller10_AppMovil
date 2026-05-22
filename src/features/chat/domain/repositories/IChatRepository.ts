import { Message, Room } from "../entities/Message";

export interface IChatRepository {
  getRooms(): Promise<Room[]>;
  createRoom(name: string, userId: string): Promise<Room>;
  getMessages(roomId: string): Promise<Message[]>;
  
  // <-- ACTUALIZADO: Ahora acepta imageUrl opcional
  sendMessage(roomId: string, userId: string, content: string, imageUrl?: string): Promise<Message>;
  
  // <-- NUEVO: Método para subir imágenes a Supabase
  uploadImage(uri: string): Promise<string>; 
  
  subscribeToRoom(roomId: string, onMessage: (msg: Message) => void): () => void;
}