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

interface Player {
  id: number;
  name: string;
}

export default function ChatScreen({ route }: any) {
  const { match, courtName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch(`/matches/${match.id}`)
      .then((d) => {
        setMessages(d.messages ?? []);
        setPlayers(d.players ?? []);
      })
      .finally(() => setLoading(false));

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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🏀 {courtName}</Text>
        <Text style={s.headerSub}>{formatDate(match.scheduled_at)} • {match.modality}</Text>
        <Text style={s.headerPlayers}>
          Jogadores: {players.map((p) => p.name).join(', ') || 'Nenhum ainda'}
        </Text>
      </View>

      {/* Messages */}
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
          ListEmptyComponent={
            <Text style={s.empty}>Nenhuma mensagem ainda{'\n'}Diga olá! 👋</Text>
          }
          renderItem={({ item }) => {
            const isMe = item.user_id === user!.id;
            return (
              <View style={[s.bubbleWrapper, isMe ? s.bubbleWrapperMe : s.bubbleWrapperThem]}>
                {!isMe && <Text style={s.bubbleName}>{item.name}</Text>}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  <Text style={s.bubbleText}>{item.message}</Text>
                  <Text style={s.bubbleTime}>{formatTime(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {typingUser && (
        <Text style={s.typing}>{typingUser} está digitando...</Text>
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Mensagem..."
          placeholderTextColor="#555"
          value={text}
          onChangeText={(t) => { setText(t); handleTyping(); }}
          multiline
          maxLength={500}
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
  header: {
    backgroundColor: '#1c1c1e', padding: 12,
    borderBottomWidth: 1, borderColor: '#333',
  },
  headerTitle: { color: '#F97316', fontWeight: 'bold', fontSize: 15 },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },
  headerPlayers: { color: '#aaa', fontSize: 11, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 12, paddingBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 24 },
  bubbleWrapper: { marginBottom: 8, maxWidth: '80%' },
  bubbleWrapperMe: { alignSelf: 'flex-end' },
  bubbleWrapperThem: { alignSelf: 'flex-start' },
  bubbleName: { color: '#aaa', fontSize: 11, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 16, padding: 10 },
  bubbleMe: { backgroundColor: '#F97316' },
  bubbleThem: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#333' },
  bubbleText: { color: '#fff', fontSize: 15 },
  bubbleTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'right', marginTop: 4 },
  typing: { color: '#888', fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  inputRow: {
    flexDirection: 'row', padding: 10, borderTopWidth: 1,
    borderColor: '#333', backgroundColor: '#1c1c1e', alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#333',
  },
  sendBtn: {
    backgroundColor: '#F97316', borderRadius: 22, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  sendBtnText: { color: '#fff', fontSize: 18 },
});
