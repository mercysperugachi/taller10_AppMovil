import { ChatError } from "../../../../shared/domain/errors/AppError";
import { Message } from "../../domain/entities/Message";
import { IChatRepository } from "../../domain/repositories/IChatRepository";

export class SendMessageUseCase {
  constructor(private readonly chatRepo: IChatRepository) {}

  async execute(roomId: string, userId: string, content: string, imageUrl?: string): Promise<Message> {
    const trimmed = content.trim();
    // Si no hay texto ni imagen, bloqueamos el mensaje
    if (!trimmed && !imageUrl) throw new ChatError("El mensaje no puede estar vacío");
    if (trimmed.length > 500) throw new ChatError("Máximo 500 caracteres");
    
    return this.chatRepo.sendMessage(roomId, userId, trimmed, imageUrl);
  }
}