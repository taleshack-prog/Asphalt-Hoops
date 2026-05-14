import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, ScrollView,
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
  is_participant?: boolean;
}

const MODALITIES = [
  { label: '1x1', value: '1x1', max: 2 },
  { label: '2x2', value: '2x2', max: 4 },
  { label: '3x3', value: '3x3', max: 6 },
  { label: '5x5', value: '5x5', max: 10 },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const HOURS = Array.from({ length: 16 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

export default function CourtDetailScreen({ route, navigation }: any) {
  const { court } = route.params;
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedModality, setSelectedModality] = useState(MODALITIES[2]);
  const [selectedDay, setSelectedDay] = useState(0);
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
      const match = await apiFetch('/matches', {
        method: 'POST',
        body: JSON.stringify({
          court_id: court.id,
          modality: selectedModality.value,
          scheduled_at: date.toISOString(),
          max_players: selectedModality.max,
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

  async function handleConfirmPresence(matchId: number) {
    try {
      await apiFetch(`/matches/${matchId}/join`, { method: 'POST' });
      const matchData = await apiFetch(`/matches/${matchId}`);
      loadMatches();
      navigation.navigate('Chat', { match: matchData.match, courtName: court.name });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

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
        <Text style={s.createBtnText}>+ Marcar Jogo</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Jogos Marcados</Text>

      {loading ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          ListEmptyComponent={<Text style={s.empty}>Nenhum jogo marcado{'\n'}Seja o primeiro!</Text>}
          renderItem={({ item }) => {
            const isFull = Number(item.player_count) >= item.max_players;
            return (
              <View style={s.matchCard}>
                <View style={s.matchLeft}>
                  <Text style={s.matchModality}>{item.modality}</Text>
                  <Text style={s.matchDate}>{formatDate(item.scheduled_at)}</Text>
                  <Text style={s.matchCreator}>criado por {item.creator_name}</Text>
                  <Text style={s.matchPlayers}>
                    {item.player_count}/{item.max_players} confirmados
                  </Text>
                </View>
                <View style={s.matchRight}>
                  <TouchableOpacity
                    style={[s.joinBtn, isFull && s.joinBtnFull]}
                    onPress={() => handleConfirmPresence(item.id)}
                    disabled={isFull}
                  >
                    <Text style={s.joinBtnText}>{isFull ? 'Lotado' : 'Confirmar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.chatBtn}
                    onPress={() => navigation.navigate('Chat', { match: item, courtName: court.name })}
                  >
                    <Text style={s.chatBtnText}>💬 Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView>
            <View style={s.modal}>
              <Text style={s.modalTitle}>🏀 Marcar Jogo</Text>
              <Text style={s.modalSubtitle}>{court.name}</Text>

              <Text style={s.label}>Modalidade</Text>
              <View style={s.optionRow}>
                {MODALITIES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[s.option, selectedModality.value === m.value && s.optionSelected]}
                    onPress={() => setSelectedModality(m)}
                  >
                    <Text style={[s.optionText, selectedModality.value === m.value && s.optionTextSelected]}>
                      {m.label}
                    </Text>
                    <Text style={[s.optionSub, selectedModality.value === m.value && s.optionTextSelected]}>
                      até {m.max} jog.
                    </Text>
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
                    <Text style={[s.optionText, { fontSize: 11 }, selectedDay === d && s.optionTextSelected]}>
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
                  {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Marcar Jogo</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  createBtn: { backgroundColor: '#F97316', margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 24 },
  matchCard: {
    backgroundColor: '#1c1c1e', borderRadius: 12, padding: 14, marginHorizontal: 16,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2c2c2e',
  },
  matchLeft: { flex: 1 },
  matchModality: { color: '#F97316', fontWeight: 'bold', fontSize: 16 },
  matchDate: { color: '#fff', marginTop: 4, fontSize: 13 },
  matchCreator: { color: '#888', fontSize: 11, marginTop: 2 },
  matchPlayers: { color: '#aaa', fontSize: 12, marginTop: 4 },
  matchRight: { alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
  joinBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  joinBtnFull: { backgroundColor: '#333' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  chatBtn: { backgroundColor: '#1c1c1e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#F97316' },
  chatBtnText: { color: '#F97316', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#F97316', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { backgroundColor: '#2c2c2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3c3c3e', alignItems: 'center' },
  optionSelected: { backgroundColor: '#F97316', borderColor: '#F97316' },
  optionText: { color: '#aaa', fontSize: 13 },
  optionSub: { color: '#666', fontSize: 10, marginTop: 2 },
  optionTextSelected: { color: '#fff', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#2c2c2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
