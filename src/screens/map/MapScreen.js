import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-maps';
import ReportBubble, { bubbleSize } from '../../components/map/ReportBubble';
import { obtenerReportesActivos } from '../../services/mapReports.service';
import { mapZoom, project, viewport } from '../../utils/mapGeometry';
import { consultarClusteres, crearMarcadores, MAX_CLUSTER_ZOOM, obtenerMiembrosCluster, prepararClusteres } from '../../utils/mapReports';
import { formatearApoyos, lugarDeReporte, mensajeDeApoyo } from '../../utils/reportFormat';
import { auth } from '../../../config/firebase';
import { apoyarReporte } from '../../services/apoyos.gateway';

const LIGHT_MAP_STYLE = [];
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C2947' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#163A32' }] },
];
const DEFAULT_REGION = {
  latitude: 9.3047,
  longitude: -75.3978,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function MapScreen({ onBack }) {
  const styles = useThemedStyles(createStyles);
  const { colors, theme } = useTheme();
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [reports, setReports] = useState([]);
  const [region, setRegion] = useState(DEFAULT_REGION);      // para agrupar (al terminar el gesto)
  const [liveRegion, setLiveRegion] = useState(DEFAULT_REGION); // para posicionar (durante el gesto)
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState(null);
  const [clusterIds, setClusterIds] = useState([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [supporting, setSupporting] = useState(false);
  const supportingRef = useRef(false);

  async function apoyarSeleccionado() {
    if (supportingRef.current || !selected) return;
    supportingRef.current = true;
    setSupporting(true);
    setSupportMessage('');
    try {
      const { apoyado, apoyos } = await apoyarReporte(selected.id);
      setSelected((current) => current?.id === selected.id ? { ...current, apoyos } : current);
      setReports((items) => items.map((item) => item.id === selected.id ? { ...item, apoyos } : item));
      setSupportMessage(mensajeDeApoyo({ apoyado, apoyos }));
    } catch (cause) {
      setSupportMessage(cause?.message || 'No se pudo comunicar con el servidor de apoyos.');
    } finally {
      supportingRef.current = false;
      setSupporting(false);
    }
  }

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
    // Conserva los clústeres del último nivel aunque el mapa permita acercarse más.
    () => consultarClusteres(preparedClusters, Math.min(mapZoom(region), MAX_CLUSTER_ZOOM), viewport(region)),
    [preparedClusters, region],
  );

  function expand(group) {
    setClusterIds(obtenerMiembrosCluster(preparedClusters, group));
    setSelected(null);
    const zoom = mapZoom(region);
    const targetZoom = Math.min(group.expansionZoom, 21);
    if (targetZoom <= zoom) return;
    const delta = 360 / (2 ** targetZoom);
    mapRef.current?.animateToRegion?.(
      { latitude: group.lat, longitude: group.lng, latitudeDelta: delta, longitudeDelta: delta },
      300,
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      {status === 'loading' && <View style={styles.message}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>Cargando reportes...</Text></View>}
      {status === 'error' && <View style={styles.message}><Text style={styles.body}>No se pudieron cargar los reportes.</Text></View>}
      {status === 'ready' && markers.length === 0 && <View style={styles.message}><Text style={styles.body}>No hay reportes activos para mostrar.</Text></View>}
      {status === 'ready' && markers.length > 0 && (
        <View
          style={styles.map}
          onLayout={(e) => setMapSize(e.nativeEvent.layout)}
        >
          <MapView
            userInterfaceStyle={theme}
            customMapStyle={theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            rotateEnabled={false}
            pitchEnabled={false}
            showsBuildings={false}
            onRegionChange={setLiveRegion}
            onRegionChangeComplete={(r) => { setRegion(r); setLiveRegion(r); }}
            onPress={() => { setSelected(null); setClusterIds([]); }}
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
                    onPress={() => {
                      setSupportMessage('');
                      if (group.isCluster) expand(group);
                      else { setClusterIds([]); setSelected(group); }
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
      {clusterIds.length > 0 && !selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reportes del clúster</Text>
          <ScrollView style={styles.clusterList}>
            {clusterIds.map((id, index) => {
              const item = preparedClusters.markersById.get(id);
              if (!item) return null;
              return (
                <TouchableOpacity key={id} accessibilityRole="button"
                  accessibilityLabel={`Ver reporte del clúster ${index + 1}`}
                  style={styles.clusterItem} onPress={() => { setSupportMessage(''); setSelected(item); }}>
                  <Text style={styles.body}>{item.tipo} · {item.descripcion}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {selected && (
        <View style={styles.card}>
          {clusterIds.length > 0 && (
            <TouchableOpacity accessibilityRole="button" onPress={() => setSelected(null)}>
              <Text style={styles.backText}>‹ Volver a los reportes del clúster</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.cardTitle}>{selected.tipo}</Text>
          <Text style={styles.body}>{selected.descripcion}</Text>
          <Text style={styles.place}>{lugarDeReporte(selected)}</Text>
          <Text style={styles.priority}>{selected.estilo.prioridad || 'Sin prioridad definida'}</Text>
          <Text style={styles.place}>{formatearApoyos(selected.apoyos ?? 0)}</Text>
          {selected.estado === 'Pendiente' && selected.usuarioId !== auth.currentUser?.uid && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apoyar reporte"
              disabled={supporting} onPress={apoyarSeleccionado} style={styles.supportButton}>
              <Text style={styles.supportText}>Apoyar reporte</Text>
            </TouchableOpacity>
          )}
          {supportMessage ? <Text accessibilityRole="alert" style={styles.place}>{supportMessage}</Text> : null}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { paddingHorizontal: 18, paddingTop: 48, paddingBottom: 12, backgroundColor: colors.surface },
  backText: { color: colors.primary, fontSize: 18, fontWeight: '600' },
  map: { flex: 1 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  card: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { color: colors.text },
  place: { marginTop: 6, color: colors.mutedText },
  priority: { marginTop: 6, color: colors.mutedText },
  clusterList: { maxHeight: 180 },
  clusterItem: { paddingVertical: 10 },
  supportButton: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  supportText: { color: colors.onPrimary, fontWeight: '700' },
});
