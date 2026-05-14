import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../services/AuthContext';

interface Group {
  id: number; name: string; creator_name: string;
  member_count: number; is_member: boolean;
}

export default function ChatListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  function loadGroups() {
    apiFetch<Group[]>('/chat/groups')
      .then(setGroups)
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadGroups(); }, []);

  async function handleCreateGroup() {
    if (!groupName.trim()) { Alert.alert('Atenção', 'Digite um nome para o grupo'); return; }
    setCreating(true);
    try {
      const group = await apiFetch('/chat/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName.trim() }),
      });
      setShowCreateModal(false);
      setGroupName('');
      loadGroups();
      navigation.navigate('Chat', { groupId: group.id, groupName: group.name });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinGroup(group: Group) {
    if (!group.is_member) {
      try {
        await apiFetch(`/chat/groups/${group.id}/join`, { method: 'POST' });
      } catch {}
    }
    navigation.navigate('Chat', { groupId: group.id, groupName: group.name });
  }

  return (
    <View style={s.container}>
      {/* Chat Geral */}
      <TouchableOpacity
        style={s.generalCard}
        onPress={() => navigation.navigate('Chat', { isGeneral: true })}
      >
        <Text style={s.generalIcon}>🌐</Text>
        <View style={s.generalInfo}>
          <Text style={s.generalTitle}>Chat Geral</Text>
          <Text style={s.generalSub}>Todos os jogadores de Porto Alegre</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </TouchableOpacity>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Grupos</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreateModal(true)}>
          <Text style={s.createBtnText}>+ Criar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => String(g.id)}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhum grupo ainda{'\n'}Crie o primeiro!</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.groupCard} onPress={() => handleJoinGroup(item)}>
              <View style={s.groupIcon}>
                <Text style={{ fontSize: 20 }}>👥</Text>
              </View>
              <View style={s.groupInfo}>
                <Text style={s.groupName}>{item.name}</Text>
                <Text style={s.groupSub}>
                  {item.member_count} membro{item.member_count !== 1 ? 's' : ''} • por {item.creator_name}
                </Text>
              </View>
              <Text style={[s.memberTag, item.is_member && s.memberTagActive]}>
                {item.is_member ? 'Membro' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>👥 Novo Grupo</Text>
            <TextInput
              style={s.input}
              placeholder="Nome do grupo..."
              placeholderTextColor="#555"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreateModal(false); setGroupName(''); }}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleCreateGroup} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Criar</Text>}
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
  generalCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e',
    margin: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F97316',
  },
  generalIcon: { fontSize: 32, marginRight: 12 },
  generalInfo: { flex: 1 },
  generalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  generalSub: { color: '#888', fontSize: 12, marginTop: 2 },
  arrow: { color: '#F97316', fontSize: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  createBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 24 },
  groupCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e',
    marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2c2c2e',
  },
  groupIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  groupInfo: { flex: 1 },
  groupName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  groupSub: { color: '#888', fontSize: 12, marginTop: 2 },
  memberTag: { color: '#aaa', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  memberTagActive: { color: '#F97316', borderColor: '#F97316' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#F97316', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#111', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#2c2c2e', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});
