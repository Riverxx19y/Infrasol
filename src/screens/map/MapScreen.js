import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-maps';
import { obtenerReportesActivos } from '../../services/mapReports.service';
import { agruparMarcadores, crearMarcadores } from '../../utils/mapReports';

const DEFAULT_REGION = {
  latitude: 9.3047,
  longitude: -75.3978,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const VIEWPORT_PADDING = 0.5;

function viewport(region) {
  const padLng = region.longitudeDelta * VIEWPORT_PADDING;
  const padLat = region.latitudeDelta * VIEWPORT_PADDING;
  return [
    Math.max(-180, region.longitude - region.longitudeDelta / 2 - padLng),
    Math.max(-90, region.latitude - region.latitudeDelta / 2 - padLat),
    Math.min(180, region.longitude + region.longitudeDelta / 2 + padLng),
    Math.min(90, region.latitude + region.latitudeDelta / 2 + padLat),
  ];
}

function mapZoom(region) {
  return Math.max(0, Math.min(21, Math.round(Math.log2(360 / region.longitudeDelta))));
}

function clusterSize(count) {
  if (count < 10) return 44;
  if (count < 100) return 52;
  return 60;
}

// Proyección Mercator: coordenada geográfica -> píxel dentro del mapa
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function project(lat, lng, region, size) {
  const west = region.longitude - region.longitudeDelta / 2;
  const top = mercY(region.latitude + region.latitudeDelta / 2);
  const bottom = mercY(region.latitude - region.latitudeDelta / 2);
  return {
    x: ((lng - west) / region.longitudeDelta) * size.width,
    y: ((top - mercY(lat)) / (top - bottom)) * size.height,
  };
}

function Bubble({ group, size, onPress, x, y }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.bubble, { left: x - size / 2, top: y - size / 2, width: size, height: size }]}
    >
      {group.isCluster ? (
        <>
          <View style={[styles.halo, { borderRadius: (size + 16) / 2 }]} />
          <View style={[styles.clusterOuter, { borderRadius: size / 2 }]}>
            <View style={[styles.clusterInner, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]}>
              <Text style={styles.clusterText}>{group.count}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={[styles.pinOuter, { backgroundColor: group.estilo.colorPrioridad }]}>
          <View style={[styles.pinInner, { backgroundColor: group.estilo.categoria }]}>
            <Text style={styles.pinSymbol}>{group.estilo.simbolo}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MapScreen({ onBack }) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [reports, setReports] = useState([]);
  const [region, setRegion] = useState(DEFAULT_REGION);      // para agrupar (al terminar el gesto)
  const [liveRegion, setLiveRegion] = useState(DEFAULT_REGION); // para posicionar (durante el gesto)
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    obtenerReportesActivos()
      .then((items) => {
        if (!active) return;
        setReports(items);
        const first = crearMarcadores(items)[0];
        if (first) {
          const initial = { ...DEFAULT_REGION, latitude: first.lat, longitude: first.lng };
          setRegion(initial);
          setLiveRegion(initial);
        }
        setStatus('ready');
      })
      .catch((error) => {
        if (error?.code) console.error('Consulta de reportes activos:', error.code, error.message);
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const markers = useMemo(() => crearMarcadores(reports), [reports]);
  const groups = useMemo(
    () => agruparMarcadores(markers, mapZoom(region), viewport(region)),
    [markers, region],
  );

  function expand(group) {
    const delta = 360 / (2 ** Math.max(group.expansionZoom, mapZoom(region) + 1));
    mapRef.current?.animateToRegion(
      { latitude: group.lat, longitude: group.lng, latitudeDelta: delta, longitudeDelta: delta },
      300,
    );
    setSelected(null);
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      {status === 'loading' && <View style={styles.message}><ActivityIndicator /><Text>Cargando reportes...</Text></View>}
      {status === 'error' && <View style={styles.message}><Text>No se pudieron cargar los reportes.</Text></View>}
      {status === 'ready' && markers.length === 0 && <View style={styles.message}><Text>No hay reportes activos para mostrar.</Text></View>}
      {status === 'ready' && markers.length > 0 && (
        <View
          style={styles.map}
          onLayout={(e) => setMapSize(e.nativeEvent.layout)}
        >
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            rotateEnabled={false}
            pitchEnabled={false}
            showsBuildings={false}
            onRegionChange={setLiveRegion}
            onRegionChangeComplete={(r) => { setRegion(r); setLiveRegion(r); }}
            onPress={() => setSelected(null)}
          />
          {mapSize.width > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {groups.map((group) => {
                const size = group.isCluster ? clusterSize(group.count) : 48;
                const { x, y } = project(group.lat, group.lng, liveRegion, mapSize);
                if (x < -size || y < -size || x > mapSize.width + size || y > mapSize.height + size) return null;
                return (
                  <Bubble
                    key={`${group.id}:${group.isCluster ? group.count : 1}`}
                    group={group}
                    size={size}
                    x={x}
                    y={y}
                    onPress={() => (group.isCluster ? expand(group) : setSelected(group))}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected.tipo}</Text>
          <Text>{selected.descripcion}</Text>
          <Text style={styles.place}>{selected.lugar || 'Ubicación sin dirección'}</Text>
          <Text style={styles.priority}>{selected.estilo.prioridad || 'Sin prioridad definida'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  back: { paddingHorizontal: 18, paddingTop: 48, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { color: '#0057FF', fontSize: 18, fontWeight: '600' },
  map: { flex: 1 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },

  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  halo: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    backgroundColor: 'rgba(0, 87, 255, 0.22)',
  },
  clusterOuter: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', elevation: 4,
  },
  clusterInner: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0057FF' },
  clusterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  pinOuter: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  pinInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pinSymbol: { fontSize: 18, textAlign: 'center' },

  card: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#CBD5E1' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  place: { marginTop: 6, color: '#475569' },
  priority: { marginTop: 6, color: '#64748B' },
});