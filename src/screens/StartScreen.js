import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificaciones } from '../hooks/useNotificaciones';

export default function StartScreen({ user, onSignOut, onCreateReport, onOpenMap, onOpenHistory, onOpenNotifications }) {
  const { pendientes } = useNotificaciones(user?.uid);
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <Text accessibilityRole="header" style={styles.title}>INFRASOL</Text>
      <Text style={styles.message}>Ayúdanos a identificar problemas de infraestructura en tu comunidad.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notificaciones" onPress={onOpenNotifications} style={styles.bell}>
        <Text style={styles.bellText}>🔔 Notificaciones</Text>
        {pendientes > 0 && <Text style={styles.badge}>{String(pendientes)}</Text>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear reporte" onPress={onCreateReport} style={styles.createButton}>
        <Text style={styles.createText}>Crear reporte</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver mapa de reportes" onPress={onOpenMap} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Ver mapa de reportes</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mis reportes" onPress={onOpenHistory} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Mis reportes</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F1F5F9',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: '#334155',
    fontSize: 16,
    textAlign: 'center',
  },
  bell: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  bellText: { color: '#0057FF', fontWeight: '700', fontSize: 16 },
  badge: { color: '#FFFFFF', backgroundColor: '#B91C1C', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', fontWeight: '700' },
  createButton: { marginTop: 28, backgroundColor: '#0057FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondaryButton: { marginTop: 16, borderWidth: 1, borderColor: '#0057FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  secondaryText: { color: '#0057FF', fontWeight: '700', fontSize: 16 },
  signOutButton: { marginTop: 24, padding: 12 },
  signOutText: { color: '#0057FF', fontWeight: '700' },
});
