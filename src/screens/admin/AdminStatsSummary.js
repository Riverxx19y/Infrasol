import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, styles } from '../auth/styles';
import { formatearApoyos, formatearTasaResolucion } from '../../utils/reportFormat';
import AdminButton from './AdminButton';

export default function ResumenAdmin({ resumen, cargando, error, consultar }) {
  return (
    <View style={resumenStyles.card}>
      <Text accessibilityRole="header" style={resumenStyles.heading}>Estadísticas generales</Text>
      {cargando && <View style={resumenStyles.loading}><ActivityIndicator /><Text>Cargando estadísticas…</Text></View>}
      {error ? (
        <>
          <Text accessibilityRole="alert" style={styles.errorBox}>{error}</Text>
          <AdminButton label="Reintentar estadísticas" onPress={() => consultar()} />
        </>
      ) : null}
      {resumen && (
        <>
          <Text style={resumenStyles.heading}>{`Total de reportes: ${resumen.total}`}</Text>
          <Text>{`Tasa de resolución: ${formatearTasaResolucion(resumen.tasaResolucion)}`}</Text>
          {Object.entries(resumen.porEstado).map(([estado, cantidad]) => (
            <Text key={estado}>{`${estado}: ${cantidad}`}</Text>
          ))}
          <Text accessibilityRole="header" style={resumenStyles.heading}>Por categoría</Text>
          {Object.entries(resumen.porTipo).map(([tipo, cantidad]) => (
            <Text key={tipo}>{`${tipo}: ${cantidad}`}</Text>
          ))}
          {resumen.total === 0 && <Text>No hay reportes para resumir.</Text>}
          {resumen.topApoyados.length > 0 && (
            <>
              <Text accessibilityRole="header" style={resumenStyles.heading}>Reportes más apoyados</Text>
              {resumen.topApoyados.map((reporte) => (
                <View key={reporte.id} style={resumenStyles.destacado}>
                  <Text style={resumenStyles.heading}>{reporte.descripcion || reporte.tipo}</Text>
                  <Text>{`${reporte.tipo} · ${reporte.estado} · ${formatearApoyos(reporte.apoyos)}`}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

const resumenStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, gap: 6 },
  heading: { color: colors.dark, fontSize: 16, fontWeight: '700' },
  destacado: { paddingTop: 8, gap: 3 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
