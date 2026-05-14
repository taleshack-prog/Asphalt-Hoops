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

interface User {
  id: number; name: string; email: string; invite_code: string;
}

export default function ChatListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');

  function loadGroups() {
    apiFetch<Group[]>('/chat/groups')
      .then(setGroups)
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }

  function loadUsers() {
    apiFetch<User[]>('/auth/users')
      .then((all) => setUsers(all.filter((u) => u.id !== user!.id)))
      .catch(() => {});
  }

  useEffect(() => { loadGroups(); loadUsers(); }, []);

  function toggleUser(id: number) {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) { Alert.alert('Atenção', 'Digite um nome para o grupo'); return; }
    setCreating(true);
    try {
      const group = await apiFetch('/chat/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName.trim(), members: selectedUsers }),
      });
      setShowCreateModal(false);
      setGroupName('');
      setSelectedUsers([]);
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
      try { await apiFetch(`/chat/groups/${group.id}/join`, { method: 'POST' }); } catch {}
    }
    navigation.navigate('Chat', { groupId: group.id, groupName: group.name });
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <View style={s.container}>
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
          <Text style={s.createBtnText}>+ Criar Grupo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => String(g.id)}
          ListEmptyComponent={<Text style={s.empty}>Nenhum grupo ainda{'\n'}Crie o primeiro!</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.groupCard} onPress={() => handleJoinGroup(item)}>
              <View style={s.groupIcon}><Text style={{ fontSize: 20 }}>👥</Text></View>
              <View style={s.groupInfo}>
                <Text style={s.groupName}>{item.name}</Text>
                <Text style={s.groupSub}>{item.member_count} membro{item.member_count !== 1 ? 's' : ''} • por {item.creator_name}</Text>
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
              style={s.input} placeholder="Nome do grupo..." placeholderTextColor="#555"
              value={groupName} onChangeText={setGroupName} maxLength={50} autoFocus
            />

            <Text style={s.label}>Convidar jogadores</Text>
            <TextInput
              style={[s.input, { marginBottom: 8 }]}
              placeholder="Buscar por nome..." placeholderTextColor="#555"
              value={userSearch} onChangeText={setUserSearch}
            />

            <FlatList
              data={filteredUsers}
              keyExtractor={(u) => String(u.id)}
              style={s.userList}
              ListEmptyComponent={<Text style={s.emptySmall}>Nenhum jogador encontrado</Text>}
              renderItem={({ item }) => {
                const selected = selectedUsers.includes(item.id);
                return (
                  <TouchableOpacity style={[s.userItem, selected && s.userItemSelected]} onPress={() => toggleUser(item.id)}>
                    <View style={s.userAvatar}>
                      <Text style={s.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={s.userName}>{item.name}</Text>
                    {selected && <Text style={s.userCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />

            {selectedUsers.length > 0 && (
              <Text style={s.selectedCount}>{selectedUsers.length} jogador{selectedUsers.length > 1 ? 'es' : ''} selecionado{selectedUsers.length > 1 ? 's' : ''}</Text>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreateModal(false); setGroupName(''); setSelectedUsers([]); setUserSearch(''); }}>
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
  generalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', margin: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F97316' },
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
  emptySmall: { color: '#555', textAlign: 'center', padding: 12 },
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  groupIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  groupInfo: { flex: 1 },
  groupName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  groupSub: { color: '#888', fontSize: 12, marginTop: 2 },
  memberTag: { color: '#aaa', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  memberTagActive: { color: '#F97316', borderColor: '#F97316' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { color: '#F97316', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#111', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  userList: { maxHeight: 200, marginBottom: 8 },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4, backgroundColor: '#111', borderWidth: 1, borderColor: '#2c2c2e' },
  userItemSelected: { borderColor: '#F97316', backgroundColor: '#2c1810' },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  userAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userName: { flex: 1, color: '#fff', fontSize: 14 },
  userCheck: { color: '#F97316', fontSize: 18, fontWeight: 'bold' },
  selectedCount: { color: '#F97316', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#2c2c2e', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});
