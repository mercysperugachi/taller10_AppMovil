import { Room } from "@features/chat/domain/entities/Message";
import { useRooms } from "@features/chat/presentation/hooks/useRooms";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; 
// Importamos Reanimated para el movimiento
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
} from "react-native";

export default function RoomsScreen() {
  const { rooms, isLoading, createRoom, isCreating, createError } = useRooms();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState("");

  const handleCreate = () => {
    if (!roomName.trim() || isCreating) return;
    createRoom(roomName.trim(), {
      onSuccess: () => {
        setRoomName("");
        setModalVisible(false);
      },
    });
  };

  // Renderizado de cada sala con animación en cascada según su índice (index)
  const renderRoom = ({ item, index }: { item: Room; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify().damping(12)}
      layout={Layout.springify()} // Anima automáticamente cuando se agrega una nueva sala
    >
      <Pressable
        onPress={() => router.push(`/chat/${item.id}` as Href)}
        style={({ pressed }) => [
          styles.roomItem,
          pressed && styles.roomItemPressed
        ]}
      >
        <View style={styles.roomIconContainer}>
          <Ionicons name="chatbubbles" size={24} color="#800020" />
        </View>
        <View style={styles.roomTextContainer}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomSubtitle}>Toca para entrar a la sala</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#B5A0A0" />
      </Pressable>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#800020" />
        <Text style={styles.loadingText}>Cargando salas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tu casita virtual de confianza</Text>
        <Text style={styles.headerSubtitle}>Explora y únete a la conversación</Text>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={renderRoom}
        contentContainerStyle={rooms.length === 0 ? { flex: 1 } : { paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.centered}>
            <Ionicons name="chatbox-ellipses-outline" size={64} color="#E8D8D8" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Todo está muy tranquilo</Text>
            <Text style={styles.empty}>Sé el primero en crear una sala de chat.</Text>
          </Animated.View>
        }
      />

      {/* Botón flotante con animación de Zoom al cargar la pantalla */}
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="none" // Desactivamos la nativa para usar Reanimated
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          {/* El modal sube elásticamente desde abajo */}
          <Animated.View 
            entering={SlideInDown.springify().damping(15).stiffness(90)} 
            style={styles.dialog}
          >
            <View style={styles.dialogHeader}>
              <Ionicons name="create-outline" size={28} color="#800020" />
              <Text style={styles.dialogTitle}>Nueva Sala</Text>
            </View>
            
            <Text style={styles.dialogDescription}>Dale un nombre atractivo a tu nueva sala de conversación.</Text>
            
            {createError && <Text style={styles.dialogError}>{createError}</Text>}
            
            <TextInput
              style={styles.dialogInput}
              placeholder="Ej: Proyecto de Tesis..."
              placeholderTextColor="#B5A0A0"
              value={roomName}
              onChangeText={setRoomName}
              autoFocus
              maxLength={50}
            />
            
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
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
                  <Text style={styles.createText}>Crear Sala</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F7" },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: "#FAF7F7",
  },
  headerTitle: { fontSize: 32, fontWeight: "800", color: "#800020", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: "#B5A0A0", marginTop: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  loadingText: { marginTop: 12, color: "#800020", fontWeight: "500" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#58181F", marginBottom: 8, textAlign: "center" },
  empty: { color: "#B5A0A0", fontSize: 15, textAlign: "center", lineHeight: 22 },
  roomItem: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(232, 216, 216, 0.5)",
  },
  roomItemPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
    backgroundColor: "#FDFBFB",
  },
  roomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roomTextContainer: { flex: 1 },
  roomName: { fontSize: 17, fontWeight: "700", color: "#58181F", marginBottom: 4 },
  roomSubtitle: { fontSize: 13, color: "#B5A0A0" },
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: Platform.OS === 'ios' ? 40 : 32,
    zIndex: 10,
  },
  fab: {
    backgroundColor: "#800020",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#800020",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.85 }],
    backgroundColor: "#58181F",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "flex-end",
  },
  dialog: { 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 32, 
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20
  },
  dialogHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dialogTitle: { fontSize: 22, fontWeight: "800", color: "#58181F", marginLeft: 12 },
  dialogDescription: { fontSize: 15, color: "#B5A0A0", marginBottom: 24, lineHeight: 22 },
  dialogError: { color: "#D32F2F", fontSize: 13, marginBottom: 12, backgroundColor: "#FFEBEE", padding: 8, borderRadius: 8 },
  dialogInput: {
    borderWidth: 1,
    borderColor: "#E8D8D8",
    backgroundColor: "#FAF7F7",
    color: "#333333",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: "#888888", fontSize: 16, fontWeight: "600" },
  createBtn: {
    backgroundColor: "#800020",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginLeft: 12,
  },
  createText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});