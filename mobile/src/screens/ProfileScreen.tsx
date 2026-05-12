import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { useAuth } from '../services/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const inviteLink = `asphalthoops://invite/${user?.invite_code}`;

  async function handleShare() {
    try {
      await Share.share({
        message: `Vem jogar basquete comigo no Asphalt Hoops! 🏀\nBaixa o app e usa meu código: ${user?.invite_code}\n${inviteLink}`,
      });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.name}>{user?.name}</Text>
      <Text style={s.email}>{user?.email}</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Seu código de convite</Text>
        <Text style={s.code}>{user?.invite_code}</Text>
        <Text style={s.cardSub}>Compartilhe para convidar amigos!</Text>
      </View>

      <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
        <Text style={s.shareBtnText}>📤 Compartilhar convite</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
        <Text style={s.logoutBtnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 24, alignItems: 'center' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 4 },
  email: { color: '#888', fontSize: 14, marginBottom: 32 },
  card: {
    backgroundColor: '#1c1c1e', borderRadius: 16, padding: 24,
    alignItems: 'center', width: '100%', marginBottom: 20,
    borderWidth: 1, borderColor: '#F97316',
  },
  cardLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  code: { color: '#F97316', fontSize: 36, fontWeight: 'bold', letterSpacing: 4 },
  cardSub: { color: '#666', fontSize: 12, marginTop: 8 },
  shareBtn: {
    backgroundColor: '#F97316', borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: {
    backgroundColor: '#1c1c1e', borderRadius: 12, padding: 14,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  logoutBtnText: { color: '#aaa', fontSize: 16 },
});
