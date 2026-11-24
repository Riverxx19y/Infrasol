import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { cardBase, font, space, topInset } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';

export default function ProfileScreen({ onBack }) {
  const { theme, colors, setTheme, persistenceError } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack}>
        <Text style={styles.link}>‹ Volver al inicio</Text>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>Perfil</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Modo oscuro</Text>
        <Switch accessibilityLabel="Modo oscuro" value={theme === 'dark'}
          onValueChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
          trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      {persistenceError && (
        <>
          <Text accessibilityRole="alert" style={styles.error}>{persistenceError}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setTheme(theme)}>
            <Text style={styles.link}>Volver a guardar el tema</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: space.xl, paddingTop: topInset, gap: space.lg },
  title: { color: colors.text, fontSize: font.title + 2, fontWeight: '800' },
  row: { ...cardBase(colors), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: font.button, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.button, paddingVertical: space.xs },
  error: { color: colors.danger },
});
