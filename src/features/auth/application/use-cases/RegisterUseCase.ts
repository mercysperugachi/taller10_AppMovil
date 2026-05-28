import { AuthError } from "../../../../shared/domain/errors/AppError";
import { User } from "../../domain/entities/User";
import { IAuthRepository } from "../../domain/IAuthRepository";

export class RegisterUseCase {
    constructor(private readonly authRepo: IAuthRepository) {}

    async execute(email: string, password: string, username: string, role: 'vendedor' | 'cliente'): Promise<User> {
        if (!email || !password || !username || !role) 
            throw new AuthError('Todos los campos son requeridos');

        if (password.length < 6) 
            throw new AuthError('La contraseña debe tener al menos 6 caracteres');

        if (username.includes(' ')) 
            throw new AuthError('El username no puede contener espacios');

        if (role !== 'vendedor' && role !== 'cliente') 
            throw new AuthError('Rol inválido');

        try {
            return await this.authRepo.register(email, password, username, role); 
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al registrar usuario';
            throw new AuthError(message, error);
        }
    }
}