import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Share, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../services/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  async function handleShare() {
    try {
      await Share.share({
        message: `🏀 Vem jogar basquete comigo no Asphalt Hoops!\n\nBaixa o app e usa meu código de convite: ${user?.invite_code}\n\nLink: https://github.com/taleshack-prog/Asphalt-Hoops/releases/latest`,
        title: 'Asphalt Hoops — Convite',
      });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Avatar */}
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {user?.name?.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={s.name}>{user?.name}</Text>
      <Text style={s.email}>{user?.email}</Text>

      {/* Invite Card */}
      <View style={s.inviteCard}>
        <Text style={s.inviteLabel}>🎟️ Seu código de convite</Text>
        <Text style={s.inviteCode}>{user?.invite_code}</Text>
        <Text style={s.inviteSub}>
          Compartilhe para convidar amigos e acompanhar quem você trouxe para o jogo!
        </Text>
      </View>

      <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
        <Text style={s.shareBtnText}>📤 Compartilhar Convite</Text>
      </TouchableOpacity>

      {/* Stats placeholder */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>0</Text>
          <Text style={s.statLabel}>Partidas</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>0</Text>
          <Text style={s.statLabel}>Amigos</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>0</Text>
          <Text style={s.statLabel}>Quadras</Text>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
        <Text style={s.logoutBtnText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 24, alignItems: 'center' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#888', fontSize: 14, marginBottom: 32 },
  inviteCard: {
    backgroundColor: '#1c1c1e', borderRadius: 16, padding: 24,
    alignItems: 'center', width: '100%', marginBottom: 16,
    borderWidth: 2, borderColor: '#F97316',
  },
  inviteLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  inviteCode: {
    color: '#F97316', fontSize: 38, fontWeight: 'bold',
    letterSpacing: 6, marginBottom: 8,
  },
  inviteSub: { color: '#666', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  shareBtn: {
    backgroundColor: '#F97316', borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 24,
  },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: '#1c1c1e', borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e',
  },
  statNum: { color: '#F97316', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  logoutBtn: {
    backgroundColor: '#1c1c1e', borderRadius: 12, padding: 14,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  logoutBtnText: { color: '#aaa', fontSize: 16 },
});
