import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../services/AuthContext';

interface Match {
  id: number;
  modality: string;
  scheduled_at: string;
  creator_name: string;
  player_count: number;
  max_players: number;
}

export default function CourtDetailScreen({ route, navigation }: any) {
  const { court } = route.params;
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  function loadMatches() {
    apiFetch<{ court: any; upcoming_matches: Match[] }>(`/courts/${court.id}`)
      .then((d) => setMatches(d.upcoming_matches))
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleCreateMatch() {
    // Agenda partida para daqui a 1 hora como exemplo
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try {
      const match = await apiFetch('/matches', {
        method: 'POST',
        body: JSON.stringify({
          court_id: court.id,
          modality: '3x3',
          scheduled_at: scheduledAt,
        }),
      });
      navigation.navigate('Chat', { match, courtName: court.name });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  async function handleJoin(matchId: number) {
    try {
      await apiFetch(`/matches/${matchId}/join`, { method: 'POST' });
      const matchData = await apiFetch(`/matches/${matchId}`);
      navigation.navigate('Chat', { match: matchData.match, courtName: court.name });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <View style={s.container}>
      <Text style={s.courtName}>🏀 {court.name}</Text>
      <Text style={s.address}>{court.address}, {court.city}</Text>

      <TouchableOpacity style={s.createBtn} onPress={handleCreateMatch}>
        <Text style={s.createBtnText}>+ Nova Partida</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Próximas Partidas</Text>

      {loading ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          ListEmptyComponent={<Text style={s.empty}>Nenhuma partida agendada</Text>}
          renderItem={({ item }) => (
            <View style={s.matchCard}>
              <View>
                <Text style={s.matchModality}>{item.modality}</Text>
                <Text style={s.matchDate}>{formatDate(item.scheduled_at)}</Text>
                <Text style={s.matchCreator}>por {item.creator_name}</Text>
              </View>
              <View style={s.matchRight}>
                <Text style={s.matchPlayers}>
                  {item.player_count}/{item.max_players} 👥
                </Text>
                <TouchableOpacity style={s.joinBtn} onPress={() => handleJoin(item.id)}>
                  <Text style={s.joinBtnText}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 16 },
  courtName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  address: { color: '#aaa', fontSize: 13, marginBottom: 20 },
  createBtn: {
    backgroundColor: '#F97316', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 24,
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  empty: { color: '#555', textAlign: 'center', marginTop: 20 },
  matchCard: {
    backgroundColor: '#1c1c1e', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  matchModality: { color: '#F97316', fontWeight: 'bold', fontSize: 15 },
  matchDate: { color: '#fff', marginTop: 4, fontSize: 13 },
  matchCreator: { color: '#888', fontSize: 11, marginTop: 2 },
  matchRight: { alignItems: 'flex-end' },
  matchPlayers: { color: '#aaa', marginBottom: 8 },
  joinBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnText: { color: '#fff', fontWeight: 'bold' },
});
