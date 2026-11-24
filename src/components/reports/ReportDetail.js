import { useThemedStyles } from '../../theme/useThemedStyles';
import { cardBase, font, outlineButton, space } from '../../theme/tokens';
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
  detail: { ...cardBase(colors), margin: space.lg, marginTop: space.xs, padding: space.xl, gap: space.sm + 2 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  description: { color: colors.text, fontSize: font.body + 1, lineHeight: 23 },
  place: { color: colors.mutedText },
  date: { color: colors.mutedText },
  button: { ...outlineButton(colors), marginTop: space.md },
  buttonText: { color: colors.primary, fontWeight: '700' },
});
