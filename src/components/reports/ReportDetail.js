import { useThemedStyles } from '../../theme/useThemedStyles';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EstadoBadge from './EstadoBadge';
import { formatearFecha, lugarDeReporte } from '../../utils/reportFormat';

// Detalle de un reporte ya cargado en la lista: no vuelve a consultar Firestore.
export default function ReportDetail({ reporte, onClose }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detail}>
      <Text style={styles.title}>{reporte.tipo}</Text>
      <EstadoBadge estado={reporte.estado} />
      <Text style={styles.description}>{reporte.descripcion}</Text>
      <Text style={styles.place}>{lugarDeReporte(reporte)}</Text>
      <Text style={styles.date}>{formatearFecha(reporte.fecha)}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a mis reportes" onPress={onClose} style={styles.button}>
        <Text style={styles.buttonText}>Volver a mis reportes</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  detail: { margin: 16, padding: 16, backgroundColor: colors.surface, borderRadius: 12, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  description: { color: colors.text, fontSize: 16 },
  place: { color: colors.mutedText },
  date: { color: colors.mutedText },
  button: { marginTop: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: colors.primary, fontWeight: '700' },
});
