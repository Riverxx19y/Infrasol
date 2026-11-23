import { Text, TouchableOpacity } from 'react-native';
import { styles } from '../auth/styles';

export default function AdminButton({ label, children, onPress, disabled, primary }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }} disabled={disabled}
      onPress={onPress} style={primary ? styles.primaryButton : styles.secondaryButton}>
      <Text style={primary ? styles.primaryText : styles.secondaryText}>{children || label}</Text>
    </TouchableOpacity>
  );
}
