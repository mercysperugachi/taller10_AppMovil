import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '@shared/infrastructure/supabase/client';
import { useAuthStore } from '@features/auth/presentation/store/authStore';
import { SupabaseAuthRepository } from '../src/features/auth/infrastructure/repositories/SupabaseAuthRepository'
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});
const authRepo = new SupabaseAuthRepository();
 
function AuthGuard() {
  const { user, setUser } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();
 
  useEffect(() => {
    // Restaurar sesión desde AsyncStorage al iniciar la app
    authRepo.getCurrentUser().then(setUser);
 
    // Escuchar cambios de sesión: token expirado, logout en otro dispositivo
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const user = await authRepo.getCurrentUser();
          setUser(user);
        } else {
          setUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);
 
  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user  && inAuth)  router.replace('/(app)');
  }, [user, segments]);
 
  return <Slot />;
}
 
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}
