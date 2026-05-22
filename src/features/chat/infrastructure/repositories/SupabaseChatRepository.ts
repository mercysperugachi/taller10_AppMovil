import { supabase } from "@shared/infrastructure/supabase/client";
import { Message, Room } from "@features/chat/domain/entities/Message";
import { IChatRepository } from "@features/chat/domain/repositories/IChatRepository";

export class SupabaseChatRepository implements IChatRepository {
  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms').select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.mapRoom);
  }

  async createRoom(name: string, userId: string): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms').insert({ name, created_by: userId }).select().single();
    if (error) throw error;
    return this.mapRoom(data);
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, room_id, user_id, content, created_at, image_url, profiles(username)') // <-- ACTUALIZADO
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(this.mapMessage);
  }
  async uploadImage(uri: string): Promise<string> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // 1. Usar FormData (El método nativo y seguro para React Native)
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      // 2. Subir el FormData directamente a Supabase
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, formData);

      if (error) throw error;

      // 3. Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error al subir imagen:", error);
      throw new Error("No se pudo subir la imagen al servidor.");
    }
  }

  async sendMessage(roomId: string, userId: string, content: string, imageUrl?: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, user_id: userId, content, image_url: imageUrl }) // <-- ACTUALIZADO
      .select('id, room_id, user_id, content, created_at, image_url, profiles(username)')
      .single();
    
    if (error) throw error;

    // --- LÓGICA DE NOTIFICACIONES ---
    supabase
      .from('profiles').select('expo_push_token')
      .neq('id', userId).not('expo_push_token', 'is', null)
      .then(({ data: profiles }) => {
        if (profiles && profiles.length > 0) {
          const expoMessages = profiles.map((p) => ({
            to: p.expo_push_token,
            sound: 'default',
            title: 'Nuevo mensaje en el chat 💬',
            body: imageUrl ? '📷 Te envió una imagen' : content,
          }));
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(expoMessages),
          }).catch(console.error);
        }
      });

    return this.mapMessage(data);
  }

  subscribeToRoom(roomId: string, onMessage: (msg: Message) => void): () => void {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', payload.new.user_id).single();
          onMessage({
            id: payload.new.id,
            roomId: payload.new.room_id,
            userId: payload.new.user_id,
            content: payload.new.content,
            createdAt: new Date(payload.new.created_at),
            authorUsername: profile?.username,
            imageUrl: payload.new.image_url, // <-- ACTUALIZADO
          });
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  private mapRoom = (raw: any): Room => ({
    id: raw.id, name: raw.name, createdBy: raw.created_by, createdAt: new Date(raw.created_at),
  });

  private mapMessage = (raw: any): Message => ({
    id: raw.id, roomId: raw.room_id, userId: raw.user_id,
    content: raw.content, createdAt: new Date(raw.created_at),
    authorUsername: raw.profiles?.username,
    imageUrl: raw.image_url, // <-- ACTUALIZADO
  });
}