import {User} from '../domain/entities/User'

export interface IAuthRepository {
    login(email: string, password: string): Promise<User>;
    register(email: string, password: string, username: string, role: 'vendedor' | 'cliente'): Promise<User>; // <-- ACTUALIZADO
    logout(): Promise<void>;
    getCurrentUser(): Promise<User | null>;
    updatePushToken(userId: string, token: string): Promise<void>;
}