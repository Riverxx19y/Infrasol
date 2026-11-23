import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-maps';
import ReportBubble, { bubbleSize } from '../../components/map/ReportBubble';
import { obtenerReportesActivos } from '../../services/mapReports.service';
import { mapZoom, project, viewport } from '../../utils/mapGeometry';
import { consultarClusteres, crearMarcadores, prepararClusteres } from '../../utils/mapReports';
import { lugarDeReporte } from '../../utils/reportFormat';

const DEFAULT_REGION = {
  latitude: 9.3047,
  longitude: -75.3978,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

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
  const preparedClusters = useMemo(() => prepararClusteres(markers), [markers]);
  const groups = useMemo(
    () => consultarClusteres(preparedClusters, mapZoom(region), viewport(region)),
    [preparedClusters, region],
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
                const size = bubbleSize(group.count, group.isCluster);
                const { x, y } = project(group.lat, group.lng, liveRegion, mapSize);
                if (x < -size || y < -size || x > mapSize.width + size || y > mapSize.height + size) return null;
                return (
                  <ReportBubble
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
          <Text style={styles.place}>{lugarDeReporte(selected)}</Text>
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
  card: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#CBD5E1' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  place: { marginTop: 6, color: '#475569' },
  priority: { marginTop: 6, color: '#64748B' },
});
