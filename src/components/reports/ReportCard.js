import { useThemedStyles } from '../../theme/useThemedStyles';
import { cardBase, font, space } from '../../theme/tokens';
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
  card: { ...cardBase(colors) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, flexShrink: 1 },
  place: { marginTop: space.sm, color: colors.mutedText, fontSize: font.label },
  date: { marginTop: space.xs, color: colors.mutedText, fontSize: font.caption },
});
