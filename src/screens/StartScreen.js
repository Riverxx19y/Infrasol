import { useThemedStyles } from '../theme/useThemedStyles';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificaciones } from '../hooks/useNotificaciones';
import { font, outlineButton, radius, shadow, solidButton, space, topInset } from '../theme/tokens';

export default function StartScreen({ user, onSignOut, onCreateReport, onOpenMap, onOpenHistory, onOpenNotifications, onOpenProfile }) {
  const styles = useThemedStyles(createStyles);
  const { pendientes } = useNotificaciones(user?.uid);
  return (
    <View style={styles.screen}>
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
      {onOpenProfile && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Perfil" onPress={onOpenProfile} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Perfil</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: space.xxl,
    paddingTop: topInset,
    paddingBottom: space.xxl,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.primary,
    fontSize: font.hero,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  message: {
    marginTop: space.sm,
    marginHorizontal: space.sm,
    color: colors.mutedText,
    fontSize: font.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  bell: {
    marginTop: space.xxl, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingVertical: 10, paddingHorizontal: space.lg, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  bellText: { color: colors.primary, fontWeight: '700', fontSize: font.button },
  badge: { color: colors.onBadge, backgroundColor: colors.badge, borderRadius: radius.pill, minWidth: 24, textAlign: 'center', paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden', fontWeight: '800', fontSize: font.caption },
  createButton: { ...solidButton(colors), marginTop: space.xxl + space.sm },
  createText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.button },
  secondaryButton: { ...outlineButton(colors), marginTop: space.md },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: font.button },
  signOutButton: { marginTop: space.xl, alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.xl },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: font.label },
});
