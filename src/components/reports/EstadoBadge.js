import { StyleSheet, Text, View } from 'react-native';
import { estiloEstado } from '../../utils/reportStatus';
import { useTheme } from '../../theme/ThemeProvider';

export default function EstadoBadge({ estado }) {
  const { colors, theme } = useTheme();
  const estilo = estiloEstado(estado);
  const neutralOscuro = theme === 'dark' && estado !== 'Pendiente' && estado !== 'Resuelto';
  return (
    <View style={[styles.badge, { backgroundColor: neutralOscuro ? colors.selected : estilo.fondo }]}>
      <Text style={[styles.text, { color: neutralOscuro ? colors.text : estilo.texto }]}>{estilo.etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontWeight: '700', fontSize: 13 },
});
