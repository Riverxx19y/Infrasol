import { useTheme } from '../../theme/ThemeProvider';
import { cardBase, font, headerStyles, outlineButton, space } from '../../theme/tokens';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReportCard from '../../components/reports/ReportCard';
import ReportDetail from '../../components/reports/ReportDetail';
import { useMisReportes } from '../../hooks/useMisReportes';

function Mensaje({ children, cargando = false }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.message}>
      {cargando && <ActivityIndicator color={colors.primary} />}
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function MyReportsScreen({ onBack }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { status, reportes, hayMas, loadingMore, loadMoreError, cargarMas } = useMisReportes();
  const [selected, setSelected] = useState(null);

  let content;
  if (status === 'loading') {
    content = <Mensaje cargando>Cargando tus reportes...</Mensaje>;
  } else if (status === 'error') {
    content = <Mensaje>No se pudieron cargar tus reportes.</Mensaje>;
  } else if (selected) {
    content = <ReportDetail reporte={selected} onClose={() => setSelected(null)} />;
  } else if (reportes.length === 0) {
    content = <Mensaje>No tienes reportes registrados.</Mensaje>;
  } else {
    content = (
      <ScrollView contentContainerStyle={styles.list}>
        {reportes.map((reporte) => (
          <ReportCard key={reporte.id} reporte={reporte} onPress={() => setSelected(reporte)} />
        ))}
        {loadMoreError && <Text style={styles.error}>No se pudieron cargar más reportes.</Text>}
        {hayMas && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cargar más" onPress={cargarMas} disabled={loadingMore} style={styles.loadMore}>
            {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Cargar más</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>Mis reportes</Text>
      {content}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  ...headerStyles(colors),
  body: { color: colors.text, fontSize: font.body, textAlign: 'center' },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  list: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl * 2, gap: space.md },
  error: { color: colors.danger, textAlign: 'center' },
  loadMore: { ...outlineButton(colors), marginTop: space.sm },
  loadMoreText: { color: colors.primary, fontWeight: '700' },
});
