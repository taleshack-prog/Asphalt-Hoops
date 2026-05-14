import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { apiFetch } from '../services/api';

MapLibreGL.setAccessToken(null);

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

interface Court {
  id: number; name: string; address: string; city: string;
  lat: number; lng: number;
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
    <View style={s.center}><ActivityIndicator color="#F97316" size="large" /></View>
  );

  return (
    <View style={s.container}>
      <MapLibreGL.MapView style={s.map} styleJSON={JSON.stringify(OSM_STYLE)}>
        <MapLibreGL.Camera zoomLevel={12} centerCoordinate={[-51.2177, -30.0353]} />
        {courts.map((court) => (
          <MapLibreGL.PointAnnotation
            key={String(court.id)}
            id={String(court.id)}
            coordinate={[Number(court.lng), Number(court.lat)]}
            onSelected={() => navigation.navigate('CourtDetail', { court })}
          >
            <View style={s.marker}><Text style={s.markerText}>🏀</Text></View>
            <MapLibreGL.Callout title={court.name} />
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  marker: { backgroundColor: '#F97316', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#fff' },
  markerText: { fontSize: 18 },
});
