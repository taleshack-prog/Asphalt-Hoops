import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { apiFetch } from '../services/api';

interface Court {
  id: number;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
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

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView
        style={s.map}
        initialRegion={{
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        {courts.map((court) => (
          <Marker
            key={court.id}
            coordinate={{ latitude: Number(court.lat), longitude: Number(court.lng) }}
            title={court.name}
            pinColor="#F97316"
          >
            <Callout onPress={() => navigation.navigate('CourtDetail', { court })}>
              <View style={s.callout}>
                <Text style={s.calloutTitle}>🏀 {court.name}</Text>
                <Text style={s.calloutAddr}>{court.address}</Text>
                <Text style={s.calloutAction}>Ver partidas →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  callout: { width: 200, padding: 8 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutAddr: { color: '#666', fontSize: 12, marginBottom: 6 },
  calloutAction: { color: '#F97316', fontWeight: 'bold', fontSize: 13 },
});
