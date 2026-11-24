import { useTheme } from '../../theme/ThemeProvider';
import { cardBase, font, headerStyles, outlineButton, radius, space } from '../../theme/tokens';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificaciones } from '../../hooks/useNotificaciones';

function fechaVisible(fecha) {
  const date = typeof fecha?.toDate === 'function' ? fecha.toDate() : fecha;
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('es-CO') : 'Fecha no disponible';
}

function Aviso({ item, onRead }) {
  const styles = useThemedStyles(createStyles);
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
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { status, notificaciones, reintentar, marcarLeida, markError } = useNotificaciones(uid);
  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>Notificaciones</Text>
      {markError && <Text accessibilityRole="alert" style={styles.updateError}>No se pudo marcar la notificación como leída. Intenta de nuevo.</Text>}
      {status === 'loading' && <View style={styles.message}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>Cargando notificaciones...</Text></View>}
      {status === 'error' && (
        <View style={styles.message}>
          <Text style={styles.body}>No se pudieron cargar las notificaciones.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar" onPress={reintentar} style={styles.retry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === 'ready' && notificaciones.length === 0 && <View style={styles.message}><Text style={styles.body}>No tienes notificaciones.</Text></View>}
      {status === 'ready' && notificaciones.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {notificaciones.map((item) => <Aviso key={item.id} item={item} onRead={marcarLeida} />)}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  ...headerStyles(colors),
  body: { color: colors.text, fontSize: font.body, textAlign: 'center' },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  list: { padding: space.lg, paddingTop: space.xs, paddingBottom: space.xxl * 2, gap: space.md },
  card: { ...cardBase(colors), gap: space.xs + 2 },
  unread: { borderColor: colors.primary, borderLeftWidth: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  reference: { color: colors.mutedText },
  description: { color: colors.text, fontWeight: '600' },
  date: { color: colors.mutedText, fontSize: 12 },
  readState: { color: colors.mutedText, fontSize: 12 },
  readButton: { ...outlineButton(colors), minHeight: 40, paddingVertical: space.sm, alignSelf: 'flex-start', marginTop: space.sm, borderRadius: radius.sm },
  readButtonText: { color: colors.primary, fontWeight: '700' },
  retry: { ...outlineButton(colors), paddingHorizontal: space.xxl },
  retryText: { color: colors.primary, fontWeight: '700' },
  updateError: { color: colors.danger, backgroundColor: colors.surface, marginHorizontal: space.lg, padding: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger },
});
