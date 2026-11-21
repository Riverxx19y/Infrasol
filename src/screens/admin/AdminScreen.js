import { Text, TouchableOpacity, View } from 'react-native';
import { colors, styles } from '../auth/styles';

export default function AdminScreen({ onSignOut }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background }}>
      <Text accessibilityRole="header" style={styles.title}>Panel de administración</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
