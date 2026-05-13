import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { apiFetch } from '../services/api';

interface Court {
  id: number;
  name: string;
  address: string;
  city: string;
}

export default function MapScreen({ navigation }: any) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Court[]>('/courts')
      .then(setCourts)
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color="#F97316" size="large" />
    </View>
  );

  return (
    <View style={s.container}>
      <Text style={s.title}>🏀 Quadras em Porto Alegre</Text>
      <FlatList
        data={courts}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('CourtDetail', { court: item })}>
            <Text style={s.courtName}>{item.name}</Text>
            <Text style={s.address}>{item.address}</Text>
            <Text style={s.city}>{item.city}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  title: { color: '#F97316', fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  card: {
    backgroundColor: '#1c1c1e', borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#333',
  },
  courtName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  address: { color: '#aaa', fontSize: 13, marginTop: 4 },
  city: { color: '#F97316', fontSize: 12, marginTop: 2 },
});
