import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router'; // Importación correcta
import { useEffect } from 'react';
import { supabase } from '@shared/infrastructure/supabase/client';
import { useAuthStore } from '@features/auth/presentation/store/authStore';

// CORRECCIÓN 1: Faltaba la carpeta "repositories" en la ruta 
import { SupabaseAuthRepository } from '@features/auth/infrastructure/SupabaseAuthRepository'; 

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});
const authRepo = new SupabaseAuthRepository();

function AuthGuard() {
  const { user, setUser } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();
  
  // CORRECCIÓN 2: Tienes que inicializar el estado de navegación aquí
  const rootNavigationState = useRootNavigationState(); 

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
    // CORRECCIÓN 3: Abortar la ejecución si Expo Router no está listo
    if (!rootNavigationState?.key) return;

    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user  && inAuth)  router.replace('/(app)');
    
    // CORRECCIÓN 4: Agregar la dependencia al arreglo
  }, [user, segments, rootNavigationState?.key]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}