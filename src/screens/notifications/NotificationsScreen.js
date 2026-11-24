import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificaciones } from '../../hooks/useNotificaciones';

function fechaVisible(fecha) {
  const date = typeof fecha?.toDate === 'function' ? fecha.toDate() : fecha;
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('es-CO') : 'Fecha no disponible';
}

function Aviso({ item, onRead }) {
  const pendiente = item.leida !== true;
  const cambio = item.tipo === 'cambio_estado';
  return (
    <View style={[styles.card, pendiente && styles.unread]}>
      <Text style={styles.cardTitle}>{cambio ? 'Cambio de estado' : 'Apoyo recibido'}</Text>
      <Text style={styles.reference}>Reporte: {item.reporteId || 'Sin referencia'}</Text>
      {cambio && <Text style={styles.description}>{item.estadoAnterior} → {item.estadoNuevo}</Text>}
      <Text style={styles.date}>{fechaVisible(item.fecha)}</Text>
      <Text style={styles.readState}>{pendiente ? 'Pendiente de lectura' : 'Leída'}</Text>
      {pendiente && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Marcar como leída: ${item.id}`}
          onPress={() => onRead(item.id)} style={styles.readButton}>
          <Text style={styles.readButtonText}>Marcar como leída</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NotificationsScreen({ uid, onBack }) {
  const { status, notificaciones, reintentar, marcarLeida, markError } = useNotificaciones(uid);
  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>Notificaciones</Text>
      {markError && <Text accessibilityRole="alert" style={styles.updateError}>No se pudo marcar la notificación como leída. Intenta de nuevo.</Text>}
      {status === 'loading' && <View style={styles.message}><ActivityIndicator /><Text>Cargando notificaciones...</Text></View>}
      {status === 'error' && (
        <View style={styles.message}>
          <Text>No se pudieron cargar las notificaciones.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar" onPress={reintentar} style={styles.retry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === 'ready' && notificaciones.length === 0 && <View style={styles.message}><Text>No tienes notificaciones.</Text></View>}
      {status === 'ready' && notificaciones.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {notificaciones.map((item) => <Aviso key={item.id} item={item} onRead={marcarLeida} />)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  back: { paddingHorizontal: 18, paddingTop: 48, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { color: '#0057FF', fontSize: 18, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', paddingHorizontal: 18, paddingVertical: 12 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 6 },
  unread: { borderColor: '#0057FF', borderLeftWidth: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  reference: { color: '#475569' },
  description: { color: '#0F172A', fontWeight: '600' },
  date: { color: '#64748B', fontSize: 12 },
  readState: { color: '#475569', fontSize: 12 },
  readButton: { alignSelf: 'flex-start', marginTop: 6, padding: 8 },
  readButtonText: { color: '#0057FF', fontWeight: '700' },
  retry: { padding: 12 },
  retryText: { color: '#0057FF', fontWeight: '700' },
  updateError: { color: '#B91C1C', paddingHorizontal: 18, paddingBottom: 8 },
});
