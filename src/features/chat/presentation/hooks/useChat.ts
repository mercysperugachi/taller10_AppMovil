import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { GetMessagesUseCase } from "@features/chat/application/use-cases/GetMessageUseCase";
import { SendMessageUseCase } from "@features/chat/application/use-cases/SendMessageUseCase";
import { SubscribeToRoomUseCase } from "@features/chat/application/use-cases/SubscribeToRoomUseCase";
import { Message } from "@features/chat/domain/entities/Message";
import { SupabaseChatRepository } from "@features/chat/infrastructure/repositories/SupabaseChatRepository";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const chatRepo = new SupabaseChatRepository();
const sendMessageUseCase = new SendMessageUseCase(chatRepo);
const getMessagesUseCase = new GetMessagesUseCase(chatRepo);
const subscribeUseCase = new SubscribeToRoomUseCase(chatRepo);

export function useChat(roomId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => getMessagesUseCase.execute(roomId),
    enabled: !!user,
    staleTime: Infinity,
  });

  useEffect(() => {
    const unsubscribe = subscribeUseCase.execute(roomId, (newMsg) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => {
        const exists = old.some((m) => m.id === newMsg.id);
        return exists ? old : [...old, newMsg];
      });
    });
    return unsubscribe;
  }, [roomId]);

  // Mutación para mensajes de texto
  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessageUseCase.execute(roomId, user!.id, content),
    onMutate: async (content) => {
      const tempMsg: Message = { id: `temp-${Date.now()}`, roomId, userId: user!.id, content, createdAt: new Date(), authorUsername: user!.username };
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => [...old, tempMsg]);
      return { tempMsg };
    },
    onSuccess: (realMsg, _content, context) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => old.map((m) => (m.id === context?.tempMsg.id ? realMsg : m)));
    },
    onError: (_err, _content, context) => {
      if (context?.tempMsg) {
        queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => old.filter((m) => m.id !== context.tempMsg.id));
      }
    },
  });

  // Mutación para enviar imágenes (Primero sube, luego envía)
  const sendImageMutation = useMutation({
    mutationFn: async (uri: string) => {
      const imageUrl = await chatRepo.uploadImage(uri);
      return sendMessageUseCase.execute(roomId, user!.id, "📷 Imagen", imageUrl);
    },
    onSuccess: (realMsg) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => {
        const exists = old.some((m) => m.id === realMsg.id);
        return exists ? old : [...old, realMsg];
      });
    }
  });

  return {
    messages,
    sendMessage: sendMutation.mutate,
    sendImage: sendImageMutation.mutate, // <-- NUEVO EXPORT
    isLoading,
    isSending: sendMutation.isPending,
    isSendingImage: sendImageMutation.isPending, // <-- NUEVO EXPORT
  };
}