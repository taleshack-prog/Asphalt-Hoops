import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Platform,
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

const MODALITIES = ['3x3', '5x5'];
const HOURS = Array.from({ length: 14 }, (_, i) => `${i + 7}:00`); // 7h às 20h

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CourtDetailScreen({ route, navigation }: any) {
  const { court } = route.params;
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedModality, setSelectedModality] = useState('3x3');
  const [selectedDay, setSelectedDay] = useState(0); // 0=hoje, 1=amanhã, etc
  const [selectedHour, setSelectedHour] = useState('10:00');
  const [creating, setCreating] = useState(false);

  function loadMatches() {
    setLoading(true);
    apiFetch<{ court: any; upcoming_matches: Match[] }>(`/courts/${court.id}`)
      .then((d) => setMatches(d.upcoming_matches))
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleCreateMatch() {
    setCreating(true);
    try {
      const date = addDays(new Date(), selectedDay);
      const [h] = selectedHour.split(':');
      date.setHours(parseInt(h), 0, 0, 0);
      const maxPlayers = selectedModality === '3x3' ? 6 : 10;
      const match = await apiFetch('/matches', {
        method: 'POST',
        body: JSON.stringify({
          court_id: court.id,
          modality: selectedModality,
          scheduled_at: date.toISOString(),
          max_players: maxPlayers,
        }),
      });
      setShowModal(false);
      loadMatches();
      navigation.navigate('Chat', { match, courtName: court.name });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCreating(false);
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

  const dayLabel = (offset: number) => {
    if (offset === 0) return 'Hoje';
    if (offset === 1) return 'Amanhã';
    return addDays(new Date(), offset).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.courtName}>🏀 {court.name}</Text>
        <Text style={s.address}>{court.address}, {court.city}</Text>
      </View>

      <TouchableOpacity style={s.createBtn} onPress={() => setShowModal(true)}>
        <Text style={s.createBtnText}>+ Agendar Nova Partida</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Próximas Partidas</Text>

      {loading ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhuma partida agendada{'\n'}Seja o primeiro!</Text>
          }
          renderItem={({ item }) => (
            <View style={s.matchCard}>
              <View style={s.matchLeft}>
                <Text style={s.matchModality}>{item.modality}</Text>
                <Text style={s.matchDate}>{formatDate(item.scheduled_at)}</Text>
                <Text style={s.matchCreator}>por {item.creator_name}</Text>
              </View>
              <View style={s.matchRight}>
                <Text style={s.matchPlayers}>
                  {item.player_count}/{item.max_players} 👥
                </Text>
                <TouchableOpacity
                  style={[s.joinBtn, Number(item.player_count) >= item.max_players && s.joinBtnFull]}
                  onPress={() => handleJoin(item.id)}
                  disabled={Number(item.player_count) >= item.max_players}
                >
                  <Text style={s.joinBtnText}>
                    {Number(item.player_count) >= item.max_players ? 'Cheio' : 'Entrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de agendamento */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>🏀 Nova Partida</Text>
            <Text style={s.modalSubtitle}>{court.name}</Text>

            <Text style={s.label}>Modalidade</Text>
            <View style={s.optionRow}>
              {MODALITIES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.option, selectedModality === m && s.optionSelected]}
                  onPress={() => setSelectedModality(m)}
                >
                  <Text style={[s.optionText, selectedModality === m && s.optionTextSelected]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Dia</Text>
            <View style={s.optionRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.option, selectedDay === d && s.optionSelected]}
                  onPress={() => setSelectedDay(d)}
                >
                  <Text style={[s.optionText, selectedDay === d && s.optionTextSelected, { fontSize: 11 }]}>
                    {dayLabel(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Horário</Text>
            <View style={s.optionRow}>
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[s.option, selectedHour === h && s.optionSelected]}
                  onPress={() => setSelectedHour(h)}
                >
                  <Text style={[s.optionText, selectedHour === h && s.optionTextSelected]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalButtons}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleCreateMatch} disabled={creating}>
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.confirmBtnText}>Agendar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { padding: 16, backgroundColor: '#1c1c1e', borderBottomWidth: 1, borderColor: '#333' },
  courtName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  address: { color: '#aaa', fontSize: 13, marginTop: 4 },
  createBtn: {
    backgroundColor: '#F97316', margin: 16, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 24 },
  matchCard: {
    backgroundColor: '#1c1c1e', borderRadius: 12, padding: 14, marginHorizontal: 16,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2c2c2e',
  },
  matchLeft: { flex: 1 },
  matchModality: { color: '#F97316', fontWeight: 'bold', fontSize: 16 },
  matchDate: { color: '#fff', marginTop: 4, fontSize: 13 },
  matchCreator: { color: '#888', fontSize: 11, marginTop: 2 },
  matchRight: { alignItems: 'flex-end', gap: 8 },
  matchPlayers: { color: '#aaa', fontSize: 13 },
  joinBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnFull: { backgroundColor: '#333' },
  joinBtnText: { color: '#fff', fontWeight: 'bold' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#F97316', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    backgroundColor: '#2c2c2e', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: '#3c3c3e',
  },
  optionSelected: { backgroundColor: '#F97316', borderColor: '#F97316' },
  optionText: { color: '#aaa', fontSize: 13 },
  optionTextSelected: { color: '#fff', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, backgroundColor: '#2c2c2e', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  cancelBtnText: { color: '#aaa', fontWeight: 'bold' },
  confirmBtn: {
    flex: 1, backgroundColor: '#F97316', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
