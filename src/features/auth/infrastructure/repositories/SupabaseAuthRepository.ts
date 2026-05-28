import { supabase } from "../../../../shared/infrastructure/supabase/client";
import { User } from "../../domain/entities/User";
import { IAuthRepository } from "../../domain/IAuthRepository";

export class SupabaseAuthRepository implements IAuthRepository {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role") 
      .eq("id", data.user.id)
      .single();

    return {
      id: data.user.id,
      email: data.user.email!,
      username: profile?.username ?? "",
      avatarUrl: profile?.avatar_url ?? undefined,
      role: profile?.role ?? 'cliente', // ACTUALIZADO
    };
  }

  async register(email: string, password: string, username: string, role: 'vendedor' | 'cliente'): Promise<User> { 
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo crear el usuario");

    // SOLUCIÓN: Cambiar .insert() por .upsert()
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, username, role }); 

    if (profileError) {
        console.error("Error al guardar perfil:", profileError);
        throw new Error(profileError.message);
    }
    
    return { id: data.user.id, email: data.user.email!, username, role }; 
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role") // <-- ACTUALIZADO
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      username: profile?.username ?? "",
      role: profile?.role ?? 'cliente', // <-- ACTUALIZADO
    };
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId);
    
    if (error) {
      console.error("Error al guardar el token push:", error);
    }
  }
}
