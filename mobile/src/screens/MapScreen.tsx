// src/screens/athlete/MapScreen.tsx
// Versão estável — mapa nativo sem UrlTile
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';

const C = {
  bg:'#0A0A0F', bg2:'#111118', bg3:'#1A1A24',
  orange:'#FF6B1A', green:'#00E5A0', blue:'#4A9EFF',
  red:'#FF4A6B', text:'#F0F0F8', text2:'#9090A8', text3:'#5A5A72',
  border:'#2A2A3A',
};

type CourtStatus = 'active' | 'busy' | 'maintenance';
interface Court {
  id:string; name:string; district:string;
  latitude:number; longitude:number;
  status:CourtStatus; activeMatch:string|null;
  players:number; distanceKm:number;
}

const COURTS: Court[] = [
  { id:'1', name:'Praça da Encol',    district:'Bela Vista',      latitude:-30.0412, longitude:-51.1979, status:'busy',        activeMatch:'3v3', players:6,  distanceKm:0.8 },
  { id:'2', name:'Parcão',            district:'Moinhos de Vento', latitude:-30.0300, longitude:-51.1940, status:'active',      activeMatch:null,  players:0,  distanceKm:1.4 },
  { id:'3', name:'Marinha do Brasil', district:'Praia de Belas',   latitude:-30.0480, longitude:-51.2261, status:'maintenance', activeMatch:null,  players:0,  distanceKm:2.1 },
  { id:'4', name:'Praça Germânia',    district:"Passo d'Areia",    latitude:-30.0170, longitude:-51.1580, status:'active',      activeMatch:'1v1', players:2,  distanceKm:3.2 },
  { id:'5', name:'Parque Redenção',   district:'Farroupilha',      latitude:-30.0366, longitude:-51.2125, status:'busy',        activeMatch:'5v5', players:10, distanceKm:1.9 },
];

const statusColor = (s:CourtStatus) =>
  s==='active' ? C.green : s==='busy' ? C.orange : C.text3;

const statusLabel = (c:Court) =>
  c.status==='maintenance' ? 'Manutenção' : c.activeMatch ?? 'Disponível';

const INITIAL_REGION = {
  latitude:-30.0346, longitude:-51.2177,
  latitudeDelta:0.08, longitudeDelta:0.08,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Court|null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const selectCourt = (court:Court) => {
    setSelected(court);
    mapRef.current?.animateToRegion({
      latitude: court.latitude - 0.005,
      longitude: court.longitude,
      latitudeDelta: 0.02, longitudeDelta: 0.02,
    }, 500);
    Animated.spring(slideAnim, { toValue:0, useNativeDriver:true, tension:80, friction:10 }).start();
  };

  const deselectCourt = () => {
    Animated.timing(slideAnim, { toValue:300, duration:250, useNativeDriver:true }).start(() => setSelected(null));
  };

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={deselectCourt}
      >
        {COURTS.map(court => court.players > 0 ? (
          <Circle key={`c-${court.id}`}
            center={{ latitude:court.latitude, longitude:court.longitude }}
            radius={court.players * 30}
            fillColor={statusColor(court.status)+'33'}
            strokeColor={statusColor(court.status)+'66'}
            strokeWidth={1}
          />
        ) : null)}

        {COURTS.map(court => (
          <Marker key={court.id}
            coordinate={{ latitude:court.latitude, longitude:court.longitude }}
            onPress={() => selectCourt(court)}
            tracksViewChanges={false}
          >
            <View style={[s.marker, { borderColor:statusColor(court.status) },
              selected?.id===court.id && s.markerActive]}>
              <View style={[s.markerDot, { backgroundColor:statusColor(court.status) }]} />
              {court.players > 0 && (
                <View style={[s.markerCount, { backgroundColor:statusColor(court.status) }]}>
                  <Text style={s.markerCountText}>{court.players}</Text>
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={s.legend}>
        {[{l:'Jogando',c:C.orange},{l:'Livre',c:C.green},{l:'Fechado',c:C.text3}].map(i => (
          <View key={i.l} style={s.legendItem}>
            <View style={[s.legendDot,{backgroundColor:i.c}]} />
            <Text style={s.legendText}>{i.l}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.centerBtn}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 600)}>
        <Text style={s.centerBtnText}>◎</Text>
      </TouchableOpacity>

      {selected && (
        <Animated.View style={[s.card, { transform:[{translateY:slideAnim}] }]}>
          <TouchableOpacity style={s.closeBtn} onPress={deselectCourt}>
            <Text style={s.closeBtnText}>×</Text>
          </TouchableOpacity>
          <View style={s.cardHeader}>
            <View style={[s.cardDot,{backgroundColor:statusColor(selected.status)}]} />
            <Text style={s.cardName}>{selected.name}</Text>
          </View>
          <Text style={s.cardDistrict}>{selected.district}</Text>
          <View style={s.cardMeta}>
            <View style={[s.badge,{backgroundColor:statusColor(selected.status)+'22',borderColor:statusColor(selected.status)+'55'}]}>
              <Text style={[s.badgeText,{color:statusColor(selected.status)}]}>{statusLabel(selected)}</Text>
            </View>
            <Text style={[s.cardDist,{color:statusColor(selected.status)}]}>{selected.distanceKm}km</Text>
          </View>
          {selected.players > 0 && <Text style={s.cardPlayers}>{selected.players} jogadores agora</Text>}
          <TouchableOpacity style={s.ctaBtn}>
            <Text style={s.ctaBtnText}>VER PARTIDAS →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {!selected && (
        <View style={s.list}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listContent}>
            {COURTS.map(court => (
              <TouchableOpacity key={court.id} style={s.chip} onPress={() => selectCourt(court)}>
                <View style={[s.chipDot,{backgroundColor:statusColor(court.status)}]} />
                <View>
                  <Text style={s.chipName} numberOfLines={1}>{court.name}</Text>
                  <Text style={s.chipDist}>{court.distanceKm}km</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={[s.fab, !selected && {bottom:110}]}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},
  map:{flex:1},
  marker:{width:30,height:30,borderRadius:15,backgroundColor:C.bg2,borderWidth:2,alignItems:'center',justifyContent:'center'},
  markerActive:{width:36,height:36,borderRadius:18},
  markerDot:{width:10,height:10,borderRadius:5},
  markerCount:{position:'absolute',top:-5,right:-5,width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},
  markerCountText:{fontSize:8,fontWeight:'800',color:'white'},
  legend:{position:'absolute',top:16,left:16,backgroundColor:'rgba(10,10,15,0.92)',borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,gap:6},
  legendItem:{flexDirection:'row',alignItems:'center',gap:6},
  legendDot:{width:8,height:8,borderRadius:4},
  legendText:{fontSize:10,color:C.text2},
  centerBtn:{position:'absolute',top:16,right:16,width:44,height:44,borderRadius:14,backgroundColor:'rgba(10,10,15,0.92)',borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  centerBtnText:{fontSize:20,color:C.blue},
  card:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:C.bg2,borderTopWidth:1,borderTopColor:C.border,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:34},
  closeBtn:{position:'absolute',top:14,right:18},
  closeBtnText:{fontSize:26,color:C.text2},
  cardHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  cardDot:{width:10,height:10,borderRadius:5},
  cardName:{fontSize:22,fontWeight:'900',color:C.text,flex:1},
  cardDistrict:{fontSize:12,color:C.text2,marginLeft:18},
  cardMeta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12},
  cardDist:{fontSize:28,fontWeight:'900'},
  cardPlayers:{fontSize:12,color:C.text2,marginTop:4},
  badge:{borderRadius:20,borderWidth:1,paddingHorizontal:10,paddingVertical:4},
  badgeText:{fontSize:10,fontWeight:'700'},
  ctaBtn:{backgroundColor:C.orange,borderRadius:14,padding:14,alignItems:'center',marginTop:14},
  ctaBtnText:{fontSize:16,fontWeight:'900',color:'#0A0A0F',letterSpacing:1},
  list:{position:'absolute',bottom:0,left:0,right:0,paddingVertical:10,backgroundColor:'rgba(10,10,15,0.88)',borderTopWidth:1,borderTopColor:C.border},
  listContent:{paddingHorizontal:16,gap:8},
  chip:{backgroundColor:C.bg3,borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,flexDirection:'row',alignItems:'center',gap:8,minWidth:130},
  chipDot:{width:8,height:8,borderRadius:4},
  chipName:{fontSize:12,fontWeight:'600',color:C.text,maxWidth:100},
  chipDist:{fontSize:11,color:C.text2,marginTop:2},
  fab:{position:'absolute',right:16,bottom:80,width:52,height:52,borderRadius:16,backgroundColor:C.orange,alignItems:'center',justifyContent:'center',elevation:4},
  fabText:{fontSize:26,color:'white',lineHeight:30},
});
