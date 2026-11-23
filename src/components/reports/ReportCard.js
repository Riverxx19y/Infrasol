import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EstadoBadge from './EstadoBadge';
import { formatearFecha, lugarDeReporte } from '../../utils/reportFormat';

export default function ReportCard({ reporte, onPress }) {
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

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  place: { marginTop: 6, color: '#475569' },
  date: { marginTop: 4, color: '#64748B' },
});
