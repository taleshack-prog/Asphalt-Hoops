import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
  Modal, TextInput, TouchableOpacity, FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { apiFetch } from '../services/api';

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
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

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

  // Gera o HTML do mapa Leaflet com as quadras
  const getMapHTML = (courts: Court[]) => {
    const markers = courts.map(c =>
      `L.marker([${c.lat}, ${c.lng}])
        .addTo(map)
        .bindPopup('<b>🏀 ${c.name}</b><br>${c.address}')
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({id:${c.id},name:'${c.name.replace(/'/g,"\\'")}',address:'${c.address.replace(/'/g,"\\'")}',city:'${c.city}',lat:${c.lat},lng:${c.lng}}));
        });`
    ).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-popup-content-wrapper { background: #1c1c1e; color: #fff; border-radius: 10px; }
    .leaflet-popup-tip { background: #1c1c1e; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([-30.0353, -51.2177], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    var icon = L.divIcon({
      html: '<div style="background:#F97316;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🏀</div>',
      iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
      className: ''
    });
    ${markers.replace(/L\.marker/g, 'L.marker([]).remove(); L.marker').replace(/L\.marker\(\[\]\)\.remove\(\); /g, '')}
  </script>
</body>
</html>`;
  };

  // Versão corrigida sem o bug de replace
  const getMapHTMLClean = (courts: Court[]) => {
    const markersJS = courts.map(c =>
      `L.marker([${c.lat}, ${c.lng}], {icon: icon}).addTo(map).bindPopup('<b>🏀 ${c.name.replace(/'/g, "\\'")}</b><br>${c.address.replace(/'/g, "\\'")}').on('click', function(){ window.ReactNativeWebView.postMessage(JSON.stringify({id:${c.id},name:"${c.name}",address:"${c.address}",city:"${c.city}",lat:${c.lat},lng:${c.lng}})); });`
    ).join('\n    ');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-popup-content-wrapper { background: #1c1c1e; color: #fff; border-radius: 10px; border: 1px solid #F97316; }
    .leaflet-popup-content { color: #fff; }
    .leaflet-popup-tip { background: #1c1c1e; }
    .leaflet-popup-close-button { color: #aaa !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([-30.0353, -51.2177], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
      subdomains: ['a','b','c']
    }).addTo(map);
    var icon = L.divIcon({
      html: '<div style="background:#F97316;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏀</div>',
      iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22], className: ''
    });
    ${markersJS}
  </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#F97316" size="large" />
        <Text style={s.loadingText}>Carregando quadras...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <WebView
        style={s.map}
        source={{ html: getMapHTMLClean(courts) }}
        onMessage={(event) => {
          try {
            const court = JSON.parse(event.nativeEvent.data);
            navigation.navigate('CourtDetail', { court });
          } catch {}
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={s.center}>
            <ActivityIndicator color="#F97316" size="large" />
          </View>
        )}
      />

      <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
        <Text style={s.addBtnText}>+ Adicionar Quadra</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>📍 Adicionar Quadra</Text>
            <TextInput
              style={s.input} placeholder="Buscar por rua ou praça..."
              placeholderTextColor="#555" value={searchQuery} onChangeText={setSearchQuery}
              onSubmitEditing={searchNominatim} returnKeyType="search"
            />
            <TouchableOpacity style={s.searchBtn} onPress={searchNominatim} disabled={searching}>
              {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>🔍 Buscar</Text>}
            </TouchableOpacity>

            {searchResults.length > 0 && (
              <FlatList
                data={searchResults} keyExtractor={(i) => String(i.place_id)} style={s.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.resultItem, selectedPlace?.place_id === item.place_id && s.resultSelected]}
                    onPress={() => { setSelectedPlace(item); setCourtName(item.display_name.split(',')[0]); }}
                  >
                    <Text style={s.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {selectedPlace && (
              <>
                <Text style={s.label}>Nome da quadra</Text>
                <TextInput
                  style={s.input} placeholder="Ex: Quadra do Parcão"
                  placeholderTextColor="#555" value={courtName} onChangeText={setCourtName}
                />
              </>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => {
                setShowAddModal(false); setSearchQuery('');
                setSearchResults([]); setSelectedPlace(null); setCourtName('');
              }}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, (!selectedPlace || !courtName.trim()) && s.confirmBtnDisabled]}
                onPress={handleAddCourt} disabled={!selectedPlace || !courtName.trim() || saving}
              >
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
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  loadingText: { color: '#aaa', marginTop: 12 },
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
