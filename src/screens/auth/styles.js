import { StyleSheet } from 'react-native';
import { radius, shadow, space } from '../../theme/tokens';

import { useThemedStyles } from '../../theme/useThemedStyles';

export function useAuthStyles() {
  return useThemedStyles(createStyles);
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 44 },
  header: { alignItems: 'center', marginBottom: 30 },
  logoWrap: { width: 92, height: 92, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 14 },
  logo: { width: '100%', height: '100%' },
  logoText: { fontSize: 34, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  logoSub: { fontSize: 12, color: colors.text, letterSpacing: 1.5, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 26, borderWidth: 1, borderColor: colors.border, ...shadow },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.mutedText, textAlign: 'center', marginTop: 7, marginBottom: 20 },
  label: { fontSize: 12, color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 54, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: space.xxl, ...shadow },
  primaryText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  secondaryButton: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, minHeight: 50, padding: 13, alignItems: 'center', justifyContent: 'center', marginTop: space.sm + 2, backgroundColor: colors.surface },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  errorBox: { backgroundColor: colors.dangerSurface, color: colors.danger, borderRadius: radius.sm, padding: space.md, marginTop: space.lg },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  hint: { fontSize: 11, color: colors.mutedText, textAlign: 'center', marginTop: 16 },
  email: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: 20 },
  digitRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  digit: { width: 42, height: 56, borderWidth: 2, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, textAlign: 'center', color: colors.text, fontSize: 23, fontWeight: '800' },
  digitFilled: { borderColor: colors.primary, backgroundColor: colors.selected },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 14 },
  successBox: { backgroundColor: colors.selected, borderRadius: 12, padding: 12, marginTop: 16 },
  successText: { color: colors.primary, fontSize: 13, textAlign: 'center' },
  linkButton: { alignSelf: 'flex-end', paddingVertical: 8, marginTop: 4 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
