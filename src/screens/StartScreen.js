import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StartScreen({ onSignOut, onCreateReport }) {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <Text accessibilityRole="header" style={styles.title}>INFRASOL</Text>
      <Text style={styles.message}>Ayúdanos a identificar problemas de infraestructura en tu comunidad.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear reporte" onPress={onCreateReport} style={styles.createButton}>
        <Text style={styles.createText}>Crear reporte</Text>
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
  createButton: { marginTop: 28, backgroundColor: '#0057FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  signOutButton: { marginTop: 24, padding: 12 },
  signOutText: { color: '#0057FF', fontWeight: '700' },
});
