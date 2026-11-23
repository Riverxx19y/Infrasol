import { StyleSheet, Text, View } from 'react-native';
import { estiloEstado } from '../../utils/reportStatus';

export default function EstadoBadge({ estado }) {
  const estilo = estiloEstado(estado);
  return (
    <View style={[styles.badge, { backgroundColor: estilo.fondo }]}>
      <Text style={[styles.text, { color: estilo.texto }]}>{estilo.etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontWeight: '700', fontSize: 13 },
});
