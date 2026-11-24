import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { cardBase, font, space } from '../../theme/tokens';
import { useAuthStyles } from '../auth/styles';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { formatearApoyos, formatearTasaResolucion } from '../../utils/reportFormat';
import AdminButton from './AdminButton';

export default function ResumenAdmin({ resumen, cargando, error, consultar }) {
  const styles = useAuthStyles();
  const { colors } = useTheme();
  const resumenStyles = useThemedStyles(createStyles);
  return (
    <View style={resumenStyles.card}>
      <Text accessibilityRole="header" style={resumenStyles.heading}>Estadísticas generales</Text>
      {cargando && <View style={resumenStyles.loading}><ActivityIndicator color={colors.primary} /><Text style={resumenStyles.text}>Cargando estadísticas…</Text></View>}
      {error ? (
        <>
          <Text accessibilityRole="alert" style={styles.errorBox}>{error}</Text>
          <AdminButton label="Reintentar estadísticas" onPress={() => consultar()} />
        </>
      ) : null}
      {resumen && (
        <>
          <Text style={resumenStyles.heading}>{`Total de reportes: ${resumen.total}`}</Text>
          <Text style={resumenStyles.text}>{`Tasa de resolución: ${formatearTasaResolucion(resumen.tasaResolucion)}`}</Text>
          {Object.entries(resumen.porEstado).map(([estado, cantidad]) => (
            <Text style={resumenStyles.text} key={estado}>{`${estado}: ${cantidad}`}</Text>
          ))}
          <Text accessibilityRole="header" style={resumenStyles.heading}>Por categoría</Text>
          {Object.entries(resumen.porTipo).map(([tipo, cantidad]) => (
            <Text style={resumenStyles.text} key={tipo}>{`${tipo}: ${cantidad}`}</Text>
          ))}
          {resumen.total === 0 && <Text style={resumenStyles.text}>No hay reportes para resumir.</Text>}
          {resumen.topApoyados.length > 0 && (
            <>
              <Text accessibilityRole="header" style={resumenStyles.heading}>Reportes más apoyados</Text>
              {resumen.topApoyados.map((reporte) => (
                <View key={reporte.id} style={resumenStyles.destacado}>
                  <Text style={resumenStyles.heading}>{reporte.descripcion || reporte.tipo}</Text>
                  <Text style={resumenStyles.text}>{`${reporte.tipo} · ${reporte.estado} · ${formatearApoyos(reporte.apoyos)}`}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { ...cardBase(colors), gap: space.xs + 2 },
  text: { color: colors.text, fontSize: font.label },
  heading: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: space.xs },
  destacado: { marginTop: space.sm, paddingTop: space.sm, gap: 3, borderTopWidth: 1, borderColor: colors.border },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
