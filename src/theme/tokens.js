import { Platform, StatusBar } from 'react-native';

// Medidas compartidas para que todas las pantallas tengan el mismo ritmo visual.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };
export const font = { caption: 12, body: 15, label: 14, button: 16, title: 24, hero: 32 };

// Margen superior para que el contenido no quede bajo la barra de estado.
export const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 16 : 56;

// Sombra suave; en modo oscuro se apoya también en el borde de las tarjetas.
export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

// Barra superior común de las pantallas internas (botón «Volver» + título).
export const headerStyles = (colors) => ({
  back: {
    paddingHorizontal: space.xl, paddingTop: topInset, paddingBottom: space.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: font.button, fontWeight: '700' },
  title: {
    fontSize: font.title, fontWeight: '800', color: colors.text,
    paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md,
  },
});

export const cardBase = (colors) => ({
  backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
  borderColor: colors.border, padding: space.lg, ...shadow,
});

export const outlineButton = (colors) => ({
  minHeight: 50, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md,
  paddingVertical: 13, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center',
  backgroundColor: colors.surface,
});

export const solidButton = (colors) => ({
  minHeight: 54, backgroundColor: colors.primary, borderRadius: radius.md,
  paddingVertical: 15, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', ...shadow,
});
