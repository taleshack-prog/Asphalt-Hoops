import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
  Modal, TextInput, TouchableOpacity, FlatList,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { apiFetch } from '../services/api';

MapLibreGL.setAccessToken(null);

const OSM_STYLE = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
});

interface Court {
  id: number; name: string; address: string;
  city: string; lat: number; lng: number;
}

interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string;
}

export default function MapScreen({ navigation }: any) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<NominatimResult | null>(null);
  const [courtName, setCourtName] = useState('');
  const [saving, setSaving] = useState(false);

  function loadCourts() {
    apiFetch<Court[]>('/courts')
      .then(setCourts)
      .catch((e) => Alert.alert('Erro', e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCourts(); }, []);

  async function searchNominatim() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const query = encodeURIComponent(searchQuery + ', Porto Alegre, RS, Brasil');
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?q=' + query + '&format=json&limit=5',
        { headers: { 'User-Agent': 'AsphaltHoops/1.0' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      Alert.alert('Erro', 'Falha na busca.');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddCourt() {
    if (!selectedPlace || !courtName.trim()) {
      Alert.alert('Atenção', 'Selecione um local e dê um nome para a quadra');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/courts', {
        method: 'POST',
        body: JSON.stringify({
          name: courtName.trim(),
          address: selectedPlace.display_name.split(',').slice(0, 3).join(','),
          city: 'Porto Alegre',
          lat: parseFloat(selectedPlace.lat),
          lng: parseFloat(selectedPlace.lon),
        }),
      });
      setShowAddModal(false);
      setSearchQuery(''); setSearchResults([]); setSelectedPlace(null); setCourtName('');
      loadCourts();
      Alert.alert('Quadra adicionada!', courtName + ' foi adicionada ao mapa.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color="#F97316" size="large" />
      <Text style={s.loadingText}>Carregando quadras...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <MapLibreGL.MapView style={s.map} styleJSON={OSM_STYLE} logoEnabled={false}>
        <MapLibreGL.Camera zoomLevel={12} centerCoordinate={[-51.2177, -30.0353]} animationMode="flyTo" animationDuration={1000} />
        {courts.map((court) => (
          <MapLibreGL.PointAnnotation
            key={String(court.id)} id={'court-' + court.id}
            coordinate={[Number(court.lng), Number(court.lat)]}
            onSelected={() => navigation.navigate('CourtDetail', { court })}
          >
            <View style={s.marker}><Text style={s.markerText}>🏀</Text></View>
            <MapLibreGL.Callout title={court.name} />
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>

      <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
        <Text style={s.addBtnText}>+ Adicionar Quadra</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Adicionar Quadra</Text>
            <TextInput style={s.input} placeholder="Buscar por rua ou praça..." placeholderTextColor="#555"
              value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={searchNominatim} returnKeyType="search" />
            <TouchableOpacity style={s.searchBtn} onPress={searchNominatim} disabled={searching}>
              {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Buscar</Text>}
            </TouchableOpacity>
            {searchResults.length > 0 && (
              <FlatList data={searchResults} keyExtractor={(i) => String(i.place_id)} style={s.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[s.resultItem, selectedPlace?.place_id === item.place_id && s.resultSelected]}
                    onPress={() => { setSelectedPlace(item); setCourtName(item.display_name.split(',')[0]); }}>
                    <Text style={s.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                )} />
            )}
            {selectedPlace && (
              <>
                <Text style={s.label}>Nome da quadra</Text>
                <TextInput style={s.input} placeholder="Ex: Quadra do Parcão" placeholderTextColor="#555"
                  value={courtName} onChangeText={setCourtName} />
              </>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]); setSelectedPlace(null); setCourtName(''); }}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, (!selectedPlace || !courtName.trim()) && s.confirmBtnDisabled]}
                onPress={handleAddCourt} disabled={!selectedPlace || !courtName.trim() || saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Adicionar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  loadingText: { color: '#aaa', marginTop: 12 },
  marker: { backgroundColor: '#F97316', borderRadius: 24, padding: 8, borderWidth: 2, borderColor: '#fff', elevation: 5 },
  markerText: { fontSize: 20 },
  addBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#F97316', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, elevation: 5 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { color: '#F97316', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#111', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 8 },
  searchBtn: { backgroundColor: '#F97316', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  resultsList: { maxHeight: 160, marginBottom: 12 },
  resultItem: { backgroundColor: '#111', padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#333' },
  resultSelected: { borderColor: '#F97316', backgroundColor: '#2c1810' },
  resultText: { color: '#fff', fontSize: 13 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#2c2c2e', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#555' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});
