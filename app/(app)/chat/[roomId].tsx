import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { Message } from "@features/chat/domain/entities/Message";
import { useChat } from "@features/chat/presentation/hooks/useChat";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from 'expo-image-picker'; 
import { Image } from 'expo-image'; 
import { Ionicons } from "@expo/vector-icons";
// Importamos Reanimated para animar la entrada de los mensajes
import Animated, { FadeInUp, Layout, ZoomIn } from "react-native-reanimated";

import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, Pressable, View, ActivityIndicator
} from "react-native";

export default function ChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { messages, sendMessage, sendImage, isSendingImage } = useChat(roomId);
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, sendMessage]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      sendImage(result.assets[0].uri);
    }
  };

  // Burbujas animadas con Reanimated
  const renderMsg = ({ item }: { item: Message }) => {
    const isOwn = item.userId === user?.id;
    return (
      <Animated.View 
        // Anima el mensaje apareciendo desde abajo con rebote
        entering={FadeInUp.springify().damping(14).stiffness(100)} 
        layout={Layout.springify()} 
        style={[styles.row, isOwn && styles.rowOwn]}
      >
        <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
          {!isOwn && <Text style={styles.author}>{item.authorUsername}</Text>}
          
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.chatImage} 
              contentFit="cover" 
              transition={200}
            />
          )}

          {/* Ocultamos el texto si es solo el placeholder "📷 Imagen" para que se vea más limpio */}
          {item.content !== "📷 Imagen" && (
            <Text style={[styles.text, isOwn && styles.textOwn]}>
              {item.content}
            </Text>
          )}
          
          <Text style={[styles.time, isOwn && styles.timeOwn]}>
            {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >


      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Área de Input Elegante */}
      <View style={styles.inputRow}>
        <Pressable 
          style={({ pressed }) => [styles.attachBtn, pressed && styles.btnPressed]} 
          onPress={pickImage} 
          disabled={isSendingImage}
        >
          {isSendingImage ? (
             <ActivityIndicator size="small" color="#800020" />
          ) : (
             <Ionicons name="image-outline" size={26} color="#800020" />
          )}
        </Pressable>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#B5A0A0"
          multiline
          maxLength={500}
        />

        <Animated.View entering={ZoomIn.duration(300)}>
          <Pressable 
            style={({ pressed }) => [
              styles.sendBtn, 
              (!input.trim()) && styles.sendBtnDisabled, // Cambia si está vacío
              pressed && styles.btnPressed
            ]} 
            onPress={handleSend}
            disabled={!input.trim()} // No permite enviar mensajes vacíos
          >
            <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F7" },
  
  // --- CABECERA ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E8D8D8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#58181F" },
  headerSubtitle: { fontSize: 12, color: "#800020", opacity: 0.7 },

  // --- LISTA DE MENSAJES ---
  listContent: { padding: 16, paddingBottom: 24 },
  row: { flexDirection: "row", marginVertical: 6 },
  rowOwn: { justifyContent: "flex-end" },
  
  // --- BURBUJAS DE CHAT ---
  bubble: { 
    maxWidth: "82%", 
    borderRadius: 20, 
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1 
  },
  own: { 
    backgroundColor: "#800020", // Color Vino para tus mensajes
    borderBottomRightRadius: 4,
  }, 
  other: { 
    backgroundColor: "#FFFFFF", // Blanco para los demás
    borderWidth: 1, 
    borderColor: "#E8D8D8", 
    borderBottomLeftRadius: 4,
  }, 
  
  author: { fontSize: 12, fontWeight: "700", color: "#58181F", marginBottom: 6 }, 
  text: { fontSize: 16, color: "#333333", lineHeight: 22 },
  textOwn: { color: "#FFFFFF" }, 
  time: { fontSize: 10, color: "#B5A0A0", marginTop: 6, alignSelf: "flex-end" },
  timeOwn: { color: "rgba(255,255,255,0.6)" }, // Hora un poco transparente en tu burbuja
  
  chatImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8, backgroundColor: "#E8D8D8" },

  // --- ZONA DE ESCRITURA ---
  inputRow: { 
    flexDirection: "row", 
    padding: 12, 
    backgroundColor: "#FFFFFF", 
    borderTopWidth: 1, 
    borderColor: "#E8D8D8", 
    alignItems: "center",
    paddingBottom: Platform.OS === 'ios' ? 28 : 12 
  },
  attachBtn: { marginRight: 8, padding: 8, borderRadius: 20, backgroundColor: "#FFF0F2" },
  btnPressed: { transform: [{ scale: 0.9 }] },

  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: "#E8D8D8", 
    backgroundColor: "#FAF7F7",
    borderRadius: 24, 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 120,
    fontSize: 16,
    color: "#333333"
  },
  
  sendBtn: { 
    marginLeft: 10, 
    backgroundColor: "#800020", 
    borderRadius: 24, 
    width: 46, 
    height: 46, 
    justifyContent: "center", 
    alignItems: "center",
    shadowColor: "#800020",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  sendBtnDisabled: {
    backgroundColor: "#E8D8D8",
    shadowOpacity: 0,
    elevation: 0
  }
});