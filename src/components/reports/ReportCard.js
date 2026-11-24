import { useThemedStyles } from '../../theme/useThemedStyles';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EstadoBadge from './EstadoBadge';
import { formatearFecha, lugarDeReporte } from '../../utils/reportFormat';

export default function ReportCard({ reporte, onPress }) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver reporte: ${reporte.tipo}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{reporte.tipo}</Text>
        <EstadoBadge estado={reporte.estado} />
      </View>
      <Text style={styles.place}>{lugarDeReporte(reporte)}</Text>
      <Text style={styles.date}>{formatearFecha(reporte.fecha)}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  place: { marginTop: 6, color: colors.mutedText },
  date: { marginTop: 4, color: colors.mutedText },
});
