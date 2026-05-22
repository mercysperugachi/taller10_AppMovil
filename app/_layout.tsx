import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@shared/infrastructure/supabase/client';
import { useAuthStore } from '@features/auth/presentation/store/authStore';
import { SupabaseAuthRepository } from '../src/features/auth/infrastructure/repositories/SupabaseAuthRepository';

// --- NUEVAS IMPORTACIONES PARA NOTIFICACIONES ---
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configurar cómo se comportan las notificaciones cuando la app está abierta
// Configurar cómo se comportan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

const authRepo = new SupabaseAuthRepository();

// Función para registrar el token de Expo
// Función para registrar el token de Expo
async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) {
    console.log('Las notificaciones Push necesitan un dispositivo físico');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permiso de notificaciones denegado.');
      return;
    }

    // Obtenemos el ID del proyecto que creamos con 'eas init'
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    if (!projectId) {
      console.warn('Falta el projectId. Ejecuta "npx eas-cli init" en la terminal.');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
    // Guardamos el token en Supabase
    await authRepo.updatePushToken(userId, token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (error) {
    // Si estamos en Expo Go en Android (SDK 53+), caerá aquí y NO romperá la app.
    console.warn("No se pudo registrar el token Push (Normal en Expo Go Android):", error);
  }
}

function AuthGuard() {
  const { user, setUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    authRepo.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser) registerForPushNotificationsAsync(currentUser.id);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const currentUser = await authRepo.getCurrentUser();
          setUser(currentUser);
          if (currentUser) registerForPushNotificationsAsync(currentUser.id);
        } else {
          setUser(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) router.replace('/(auth)/login');
    else if (user && inAuthGroup) router.replace('/(app)');
  }, [user, segments, isReady, rootNavigationState]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}