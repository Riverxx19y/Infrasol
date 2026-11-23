import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, styles } from '../auth/styles';
import { useAdminReports } from '../../hooks/useAdminReports';
import { useAdminStats } from '../../hooks/useAdminStats';
import { lugarDeReporte } from '../../utils/reportFormat';
import { siguienteEstadoReporte } from '../../utils/reportStatus';
import AdminButton from './AdminButton';
import ResumenAdmin from './AdminStatsSummary';

export default function AdminScreen({ onSignOut }) {
  const estadisticas = useAdminStats();
  const {
    reportes, cursor, seleccion, error, conflicto, errorCarga, cargando, actualizando,
    cargar, seleccionar, prepararConfirmacion, cerrarSelector, confirmarCambio,
  } = useAdminReports({ onCambioConfirmado: () => estadisticas.consultar({ forzar: true }) });
  const bloqueado = cargando || actualizando;

  return (
    <ScrollView style={panel.screen} contentContainerStyle={panel.content}>
      <Text accessibilityRole="header" style={styles.title}>Panel de administración</Text>
      <AdminButton label="Cerrar sesión" onPress={onSignOut} />
      <ResumenAdmin {...estadisticas} />
      {cargando && <View style={panel.loading}><ActivityIndicator /><Text>Cargando reportes…</Text></View>}
      {error ? <Text accessibilityRole="alert" style={styles.errorBox}>{error}</Text> : null}
      {(conflicto || errorCarga) && <AdminButton label="Recargar reportes" disabled={bloqueado} onPress={() => cargar()} />}
      {!cargando && !error && reportes.length === 0 && <Text>No hay reportes disponibles.</Text>}
      {reportes.map((reporte) => {
        const nombre = reporte.descripcion || reporte.tipo || reporte.id;
        const siguiente = siguienteEstadoReporte(reporte.estado);
        return (
          <View key={reporte.id} style={panel.card}>
            <Text style={panel.heading}>{nombre}</Text>
            {reporte.tipo && reporte.tipo !== nombre && <Text>{reporte.tipo}</Text>}
            <Text>{lugarDeReporte(reporte)}</Text>
            <Text>Estado: {reporte.estado}</Text>
            {siguiente && (
              <AdminButton label={`Cambiar estado de ${nombre}`} disabled={bloqueado || conflicto || !!seleccion}
                onPress={() => seleccionar(reporte, siguiente)}>
                Cambiar estado
              </AdminButton>
            )}
            {seleccion?.reporte.id === reporte.id && (
              <View style={panel.selector}>
                {seleccion.confirmando ? (
                  <>
                    <Text>{`¿Cambiar el estado a «${seleccion.estadoNuevo}»?`}</Text>
                    <AdminButton label="Confirmar cambio de estado" primary disabled={actualizando} onPress={confirmarCambio}>
                      {actualizando ? 'Guardando cambio…' : 'Confirmar cambio de estado'}
                    </AdminButton>
                  </>
                ) : <AdminButton label={seleccion.estadoNuevo} onPress={prepararConfirmacion} />}
                <AdminButton label="Cancelar" disabled={actualizando} onPress={cerrarSelector} />
              </View>
            )}
          </View>
        );
      })}
      {cursor && !conflicto && <AdminButton label="Cargar más reportes" disabled={bloqueado || !!seleccion} onPress={() => cargar(cursor)} />}
    </ScrollView>
  );
}

const panel = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 48, gap: 16 },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, gap: 6 },
  heading: { color: colors.dark, fontSize: 16, fontWeight: '700' },
  selector: { marginTop: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
