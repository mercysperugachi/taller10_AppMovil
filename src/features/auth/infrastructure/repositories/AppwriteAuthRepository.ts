import { ID } from 'react-native-appwrite';
import { account, databases, APPWRITE_CONFIG } from '../../../../shared/infrastructure/appwrite/client';
import { User } from '../../domain/entities/User';
import { IAuthRepository } from '../../domain/IAuthRepository';

export class AppwriteAuthRepository implements IAuthRepository {
  
async login(email: string, password: string): Promise<User> {
    try {
      try {
        await account.deleteSession('current');
      } catch (e) { /* Si no hay sesión, no pasa nada, lo ignoramos */ }

      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();

      const profile = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.profilesCollectionId,
        currentUser.$id
      );

      return {
        id: currentUser.$id,
        email: currentUser.email,
        username: profile.username,
        role: profile.role, 
      };
    } catch (error) {
      console.error("DEBUG LOGIN ERROR:", error);
      throw error;
    }
  }

    async register(email: string, password: string, username: string, role: 'vendedor' | 'cliente'): Promise<User> {
        try {
        const newAccount = await account.create(ID.unique(), email, password, username);
        await account.createEmailPasswordSession(email, password);

        await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.profilesCollectionId,
            newAccount.$id, 
            { username: username, role: role }
        );

        return { id: newAccount.$id, email, username, role };
        } catch (error) {
        console.error("ERROR EXACTO DE APPWRITE:", error); 
        throw error;
        }
    }

  async logout(): Promise<void> {
    await account.deleteSession('current');
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = await account.get();
      const profile = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.profilesCollectionId,
        currentUser.$id
      );

      return {
        id: currentUser.$id,
        email: currentUser.email,
        username: profile.username,
        role: profile.role,
      };
    } catch (error) {
      // Si no hay sesión activa, devolvemos null tranquilamente
      return null; 
    }
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.profilesCollectionId,
        userId,
        { expo_push_token: token }
      );
    } catch (error) {
      console.error("Error al actualizar token en Appwrite:", error);
    }
  }
}