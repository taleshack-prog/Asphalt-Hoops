import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { apiFetch } from '../services/api';
import { connectSocket } from '../services/socket';
import { useAuth } from '../services/AuthContext';

interface Message {
  id: number;
  message: string;
  name: string;
  user_id: number;
  created_at: string;
}

export default function ChatScreen({ route }: any) {
  const { match, courtName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Carrega histórico
    apiFetch(`/matches/${match.id}`)
      .then((d) => setMessages(d.messages))
      .finally(() => setLoading(false));

    // Conecta socket
    const sock = connectSocket(user!.id);
    sock.emit('join_match_chat', match.id);

    sock.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });

    sock.on('user_typing', ({ userName }: { userName: string }) => {
      if (userName === user!.name) return;
      setTypingUser(userName);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
    });

    return () => {
      sock.emit('leave_match_chat', match.id);
      sock.off('new_message');
      sock.off('user_typing');
    };
  }, []);

  function handleTyping() {
    const sock = connectSocket(user!.id);
    sock.emit('typing', { matchId: match.id, userName: user!.name });
  }

  function sendMessage() {
    if (!text.trim()) return;
    const sock = connectSocket(user!.id);
    sock.emit('send_message', {
      matchId: match.id,
      userId: user!.id,
      message: text.trim(),
    });
    setText('');
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>🏀 {courtName}</Text>
        <Text style={s.headerSub}>{new Date(match.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#F97316" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={s.empty}>Seja o primeiro a mandar mensagem!</Text>}
          renderItem={({ item }) => {
            const isMe = item.user_id === user!.id;
            return (
              <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                {!isMe && <Text style={s.bubbleName}>{item.name}</Text>}
                <Text style={s.bubbleText}>{item.message}</Text>
                <Text style={s.bubbleTime}>{formatTime(item.created_at)}</Text>
              </View>
            );
          }}
        />
      )}

      {typingUser && (
        <Text style={s.typing}>{typingUser} está digitando...</Text>
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Mensagem..."
          placeholderTextColor="#555"
          value={text}
          onChangeText={(t) => { setText(t); handleTyping(); }}
          multiline
        />
        <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
          <Text style={s.sendBtnText}>▶</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1c1c1e', padding: 12, borderBottomWidth: 1, borderColor: '#333' },
  headerTitle: { color: '#F97316', fontWeight: 'bold', fontSize: 15 },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 12, paddingBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  bubble: {
    maxWidth: '75%', borderRadius: 14, padding: 10, marginBottom: 8,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#F97316' },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#1c1c1e' },
  bubbleName: { color: '#aaa', fontSize: 11, marginBottom: 3 },
  bubbleText: { color: '#fff', fontSize: 15 },
  bubbleTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'right', marginTop: 3 },
  typing: { color: '#888', fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  inputRow: {
    flexDirection: 'row', padding: 10, borderTopWidth: 1,
    borderColor: '#333', backgroundColor: '#1c1c1e', alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#F97316', borderRadius: 20, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  sendBtnText: { color: '#fff', fontSize: 16 },
});
