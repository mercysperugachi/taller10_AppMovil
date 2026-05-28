import { Room } from "@features/chat/domain/entities/Message";
import { useRooms } from "@features/chat/presentation/hooks/useRooms";
import { useAuthStore } from "@features/auth/presentation/store/authStore"; // <-- NUEVO IMPORT
import { useRouter } from "expo-router";
import { useState } from "react";
import { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn, Layout, SlideInDown, FadeIn } from "react-native-reanimated";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  RefreshControl
} from "react-native";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';

export default function ProductsScreen() { 
  const { rooms: products, isLoading, createRoom, isCreating, createError, refetch } = useRooms(); // rooms ahora se trata como productos
  const user = useAuthStore((s) => s.user); // OBTENEMOS EL USUARIO
  const router = useRouter();
  

  const [modalVisible, setModalVisible] = useState(false);
  const [productName, setProductName] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch(); // Llama a Supabase nuevamente
    setRefreshing(false);
  };

  const isVendedor = user?.role === 'vendedor'; // <-- LÓGICA DE ROLES

  const handleCreate = () => {
    if (!productName.trim() || isCreating) return;
    
    // <-- Agrega una vibración media al presionar publicar
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 

    createRoom(productName.trim(), {
      onSuccess: () => {
        setProductName("");
        setModalVisible(false);
        // <-- Vibración de éxito cuando termina
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const renderProduct = ({ item, index }: { item: Room; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify().damping(12)}
      layout={Layout.springify()}
    >
      <Pressable
        onPress={() => router.push(`/chat/${item.id}` as Href)}
        style={({ pressed }) => [styles.roomItem, pressed && styles.roomItemPressed]}
      >
        <View style={styles.roomIconContainer}>
          <Ionicons name="pricetag" size={24} color="#800020" /> 
        </View>
        <View style={styles.roomTextContainer}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomSubtitle}>Toca para preguntar al vendedor</Text> 
        </View>
        <Ionicons name="chevron-forward" size={20} color="#B5A0A0" />
      </Pressable>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#800020" />
        <Text style={styles.loadingText}>Cargando catálogo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nuestros Productos    <MaterialCommunityIcons name="dog" size={50} color="black" /></Text>
  
        <Text style={styles.headerSubtitle}>
          {isVendedor ? "Administra tu catálogo" : "Explora y resuelve tus dudas"}
        </Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#800020" 
            colors={["#800020"]} // Para Android
          />
        }
        contentContainerStyle={products.length === 0 ? { flex: 1 } : { paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.centered}>
            <Ionicons name="cart-outline" size={64} color="#E8D8D8" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>El catálogo está vacío</Text>
            <Text style={styles.empty}>
              {isVendedor 
                ? "Agrega tu primer producto para empezar a vender." 
                : "Aún no hay productos disponibles. Vuelve más tarde."}
            </Text>
          </Animated.View>
        }
      />

      {/* --- RESTRICCIÓN DE ROL: Solo el vendedor ve el FAB --- */}
      {isVendedor && (
        <Animated.View 
          style={styles.fabContainer}
          entering={ZoomIn.delay(500).springify().damping(10)}
        >
          <Pressable 
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} 
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        {/* --- CAMBIO AQUÍ: Usamos KeyboardAvoidingView en lugar de View --- */}
        <KeyboardAvoidingView 
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              Keyboard.dismiss();     // <-- Baja el teclado primero
              setModalVisible(false); // <-- Cierra el modal
            }} 
            activeOpacity={1} 
          />
          <Animated.View entering={SlideInDown.springify().damping(15).stiffness(90)} style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <Ionicons name="pricetag-outline" size={28} color="#800020" />
              <Text style={styles.dialogTitle}>Nuevo Producto</Text>
            </View>
            
            <Text style={styles.dialogDescription}>Ingresa el nombre del producto que deseas publicar.</Text>
            
            {createError && <Text style={styles.dialogError}>{createError}</Text>}
            
            <TextInput
              style={styles.dialogInput}
              placeholder="Ej: Chaleco para gatos..."
              placeholderTextColor="#B5A0A0"
              value={productName}
              onChangeText={setProductName}
              autoFocus
              maxLength={50}
            />
            
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
          
              <TouchableOpacity
                style={[styles.createBtn, isCreating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createText}>Publicar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F7" },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: "#FAF7F7" },
  headerTitle: { fontSize: 32, fontWeight: "800", color: "#800020", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: "#B5A0A0", marginTop: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  loadingText: { marginTop: 12, color: "#800020", fontWeight: "500" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#58181F", marginBottom: 8, textAlign: "center" },
  empty: { color: "#B5A0A0", fontSize: 15, textAlign: "center", lineHeight: 22 },
  roomItem: { backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12, borderRadius: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "rgba(232, 216, 216, 0.5)" },
  roomItemPressed: { transform: [{ scale: 0.96 }], opacity: 0.9, backgroundColor: "#FDFBFB" },
  roomIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF0F2", justifyContent: "center", alignItems: "center", marginRight: 16 },
  roomTextContainer: { flex: 1 },
  roomName: { fontSize: 17, fontWeight: "700", color: "#58181F", marginBottom: 4 },
  roomSubtitle: { fontSize: 13, color: "#B5A0A0" },
  fabContainer: { position: "absolute", right: 24, bottom: Platform.OS === 'ios' ? 40 : 32, zIndex: 10 },
  fab: { backgroundColor: "#800020", width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", shadowColor: "#800020", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabPressed: { transform: [{ scale: 0.85 }], backgroundColor: "#58181F" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  dialog: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: Platform.OS === 'ios' ? 50 : 32, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  dialogHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dialogTitle: { fontSize: 22, fontWeight: "800", color: "#58181F", marginLeft: 12 },
  dialogDescription: { fontSize: 15, color: "#B5A0A0", marginBottom: 24, lineHeight: 22 },
  dialogError: { color: "#D32F2F", fontSize: 13, marginBottom: 12, backgroundColor: "#FFEBEE", padding: 8, borderRadius: 8 },
  dialogInput: { borderWidth: 1, borderColor: "#E8D8D8", backgroundColor: "#FAF7F7", color: "#333333", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24, fontSize: 16 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: "#888888", fontSize: 16, fontWeight: "600" },
  createBtn: { backgroundColor: "#800020", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginLeft: 12 },
  createText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 }
});