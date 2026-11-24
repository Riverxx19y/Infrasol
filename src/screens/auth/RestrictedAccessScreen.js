import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStyles } from './styles';

export default function RestrictedAccessScreen({ onSignOut }) {
  const styles = useAuthStyles();
  return (
    <View style={[styles.screen, { justifyContent: 'center', padding: 24 }]}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Acceso restringido</Text>
        <Text style={styles.subtitle}>Tu cuenta no tiene un rol habilitado para acceder a la aplicación.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={styles.secondaryButton} onPress={onSignOut}>
          <Text style={styles.secondaryText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
