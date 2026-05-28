import { ID, Query } from 'react-native-appwrite';

import { databases, storage, APPWRITE_CONFIG, client as appwriteClient } from '../../../../shared/infrastructure/appwrite/client';
import { Message, Room } from '../../domain/entities/Message';
import { IChatRepository } from '../../domain/repositories/IChatRepository';

export class AppwriteChatRepository implements IChatRepository {
  
  async getRooms(): Promise<Room[]> {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.roomsCollectionId,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents.map(this.mapRoom);
  }

  async createRoom(name: string, userId: string): Promise<Room> {
    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.roomsCollectionId,
      ID.unique(),
      { name, createdBy: userId }
    );
    return this.mapRoom(document);
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.messagesCollectionId,
      [
        Query.equal('roomId', roomId),
        Query.orderAsc('$createdAt'),
        Query.limit(50)
      ]
    );
    return response.documents.map(this.mapMessage);
  }

    async uploadImage(uri: string): Promise<string> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // 1. Obtenemos el archivo real para que Appwrite sepa su tamaño exacto
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Construimos el objeto incluyendo la propiedad 'size'
      const file = {
        uri: uri,
        name: fileName,
        type: blob.type || 'image/jpeg',
        size: blob.size, // <-- ¡ESTA LÍNEA ES LA QUE SOLUCIONA EL ERROR!
      };

      const uploadedFile = await storage.createFile(
        APPWRITE_CONFIG.storageBucketId,
        ID.unique(),
        file as any
      );

      // Obtenemos la URL pública de la imagen
      const fileUrl = storage.getFileView(APPWRITE_CONFIG.storageBucketId, uploadedFile.$id);
      return fileUrl.toString();
    } catch (error) {
      console.error("Error subiendo imagen a Appwrite:", error);
      throw new Error("No se pudo subir la imagen al servidor.");
    }
  }

  async sendMessage(roomId: string, userId: string, content: string, imageUrl?: string): Promise<Message> {
    // Para simplificar lecturas en Appwrite, obtenemos el nombre del autor antes de guardar el mensaje
    const profile = await databases.getDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.profilesCollectionId, userId);

    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.messagesCollectionId,
      ID.unique(),
      {
        roomId,
        userId,
        content,
        imageUrl: imageUrl || null,
        authorUsername: profile.username
      }
    );
    return this.mapMessage(document);
  }

  subscribeToRoom(roomId: string, onMessage: (msg: Message) => void): () => void {
    const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.messagesCollectionId}.documents`;
    
    const unsubscribe = appwriteClient.subscribe(channel, (response) => {
      // Verificamos si el evento es de creación (INSERT)
      if (response.events.includes('databases.*.collections.*.documents.*.create')) {
        const newDoc: any = response.payload;
        // Filtramos para asegurar que el mensaje pertenezca a la sala actual
        if (newDoc.roomId === roomId) {
          onMessage(this.mapMessage(newDoc));
        }
      }
    });

    return () => unsubscribe();
  }

  // Mapeadores para adaptar los documentos de Appwrite ($id, $createdAt) a tu entidad de Dominio
  private mapRoom = (raw: any): Room => ({
    id: raw.$id,
    name: raw.name,
    createdBy: raw.createdBy,
    createdAt: new Date(raw.$createdAt),
  });

  private mapMessage = (raw: any): Message => ({
    id: raw.$id,
    roomId: raw.roomId,
    userId: raw.userId,
    content: raw.content,
    createdAt: new Date(raw.$createdAt),
    authorUsername: raw.authorUsername,
    imageUrl: raw.imageUrl,
  });
}