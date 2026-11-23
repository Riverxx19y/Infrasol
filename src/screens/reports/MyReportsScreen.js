import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerMisReportes } from '../../services/misReportes.service';
import { estiloEstado } from '../../utils/reportStatus';

function formatearFecha(fecha) {
  const date = typeof fecha?.toDate === 'function' ? fecha.toDate() : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

const lugarDe = (reporte) => reporte.lugar || 'Ubicación sin dirección';

function EstadoBadge({ estado }) {
  const estilo = estiloEstado(estado);
  return (
    <View style={[styles.badge, { backgroundColor: estilo.fondo }]}>
      <Text style={[styles.badgeText, { color: estilo.texto }]}>{estilo.etiqueta}</Text>
    </View>
  );
}

export default function MyReportsScreen({ onBack }) {
  const [status, setStatus] = useState('loading');
  const [reportes, setReportes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [selected, setSelected] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    obtenerMisReportes()
      .then((page) => {
        if (!mounted.current) return;
        setReportes(page.reportes);
        setCursor(page.cursor);
        setHayMas(page.hayMas);
        setStatus('ready');
      })
      .catch((error) => {
        if (error?.code) console.error('Consulta de mis reportes:', error.code, error.message);
        if (mounted.current) setStatus('error');
      });
    return () => { mounted.current = false; };
  }, []);

  async function cargarMas() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await obtenerMisReportes({ cursor });
      if (!mounted.current) return;
      setReportes((actuales) => {
        const ids = new Set(actuales.map((r) => r.id));
        return [...actuales, ...page.reportes.filter((r) => !ids.has(r.id))];
      });
      setCursor(page.cursor);
      setHayMas(page.hayMas);
    } catch (error) {
      if (error?.code) console.error('Consulta de mis reportes:', error.code, error.message);
      if (mounted.current) setLoadMoreError(true);
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }

  let content;
  if (status === 'loading') {
    content = <View style={styles.message}><ActivityIndicator /><Text>Cargando tus reportes...</Text></View>;
  } else if (status === 'error') {
    content = <View style={styles.message}><Text>No se pudieron cargar tus reportes.</Text></View>;
  } else if (selected) {
    content = (
      <View style={styles.detail}>
        <Text style={styles.cardTitle}>{selected.tipo}</Text>
        <EstadoBadge estado={selected.estado} />
        <Text style={styles.detailText}>{selected.descripcion}</Text>
        <Text style={styles.place}>{lugarDe(selected)}</Text>
        <Text style={styles.date}>{formatearFecha(selected.fecha)}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a mis reportes" onPress={() => setSelected(null)} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Volver a mis reportes</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (reportes.length === 0) {
    content = <View style={styles.message}><Text>No tienes reportes registrados.</Text></View>;
  } else {
    content = (
      <ScrollView contentContainerStyle={styles.list}>
        {reportes.map((reporte) => (
          <TouchableOpacity
            key={reporte.id}
            accessibilityRole="button"
            accessibilityLabel={`Ver reporte: ${reporte.tipo}`}
            onPress={() => setSelected(reporte)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{reporte.tipo}</Text>
              <EstadoBadge estado={reporte.estado} />
            </View>
            <Text style={styles.place}>{lugarDe(reporte)}</Text>
            <Text style={styles.date}>{formatearFecha(reporte.fecha)}</Text>
          </TouchableOpacity>
        ))}
        {loadMoreError && <Text style={styles.error}>No se pudieron cargar más reportes.</Text>}
        {hayMas && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cargar más" onPress={cargarMas} disabled={loadingMore} style={styles.secondaryButton}>
            {loadingMore ? <ActivityIndicator /> : <Text style={styles.secondaryText}>Cargar más</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>Mis reportes</Text>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  back: { paddingHorizontal: 18, paddingTop: 48, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { color: '#0057FF', fontSize: 18, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', paddingHorizontal: 18, paddingVertical: 12 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontWeight: '700', fontSize: 13 },
  place: { marginTop: 6, color: '#475569' },
  date: { marginTop: 4, color: '#64748B' },
  detail: { margin: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, gap: 8 },
  detailText: { color: '#0F172A', fontSize: 16 },
  error: { color: '#B91C1C', textAlign: 'center' },
  secondaryButton: { marginTop: 8, borderWidth: 1, borderColor: '#0057FF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#0057FF', fontWeight: '700' },
});
