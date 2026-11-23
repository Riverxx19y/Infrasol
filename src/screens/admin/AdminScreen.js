import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, styles } from '../auth/styles';
import { cambiarEstadoReporte, listarReportesAdmin } from '../../services/adminReports.gateway';
import { lugarDeReporte } from '../../utils/reportFormat';

const SIGUIENTE_ESTADO = new Map([
  ['Pendiente', 'En revisión'],
  ['En revisión', 'Asignado'],
  ['Asignado', 'Resuelto'],
]);

function Boton({ label, children, onPress, disabled, primary }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }} disabled={disabled}
      onPress={onPress} style={primary ? styles.primaryButton : styles.secondaryButton}>
      <Text style={primary ? styles.primaryText : styles.secondaryText}>{children || label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminScreen({ onSignOut }) {
  const [reportes, setReportes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const ocupado = useRef(false);

  async function cargar(pagina) {
    if (ocupado.current) return;
    ocupado.current = true;
    setCargando(true);
    setError('');
    setErrorCarga(false);
    try {
      const result = await listarReportesAdmin(pagina ? { cursor: pagina } : undefined);
      setReportes((actuales) => pagina ? [...actuales, ...result.reportes] : result.reportes);
      setCursor(result.cursor);
      setConflicto(false);
    } catch (cause) {
      setErrorCarga(true);
      setError(`No se pudieron cargar los reportes. ${cause?.message || 'Intenta de nuevo.'}`);
    } finally {
      ocupado.current = false;
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function cerrarSelector() {
    setSeleccion(null);
    setConfirmando(false);
  }

  async function confirmarCambio() {
    if (ocupado.current || !seleccion || !confirmando || conflicto) return;
    const estadoNuevo = SIGUIENTE_ESTADO.get(seleccion.estado);
    if (!estadoNuevo) return;
    ocupado.current = true;
    setActualizando(true);
    setError('');
    try {
      const result = await cambiarEstadoReporte(seleccion.id, {
        estadoNuevo, versionEstadoEsperada: seleccion.versionEstado ?? 0,
      });
      setReportes((actuales) => actuales.map((reporte) => reporte.id === seleccion.id
        ? { ...reporte, estado: result.estado, versionEstado: result.versionEstado }
        : reporte));
    } catch (cause) {
      setConflicto(cause?.status === 409);
      setError(cause?.status === 409
        ? `Conflicto de estado. ${cause.message || 'Recarga los reportes.'}`
        : cause?.message || 'No se pudo actualizar el estado.');
    } finally {
      cerrarSelector();
      ocupado.current = false;
      setActualizando(false);
    }
  }

  const bloqueado = cargando || actualizando;
  const siguiente = SIGUIENTE_ESTADO.get(seleccion?.estado);

  return (
    <ScrollView style={panel.screen} contentContainerStyle={panel.content}>
      <Text accessibilityRole="header" style={styles.title}>Panel de administración</Text>
      <Boton label="Cerrar sesión" onPress={onSignOut} />
      {cargando && <View style={panel.loading}><ActivityIndicator /><Text>Cargando reportes…</Text></View>}
      {error ? <Text accessibilityRole="alert" style={styles.errorBox}>{error}</Text> : null}
      {(conflicto || errorCarga) && <Boton label="Recargar reportes" disabled={bloqueado} onPress={() => cargar()} />}
      {!cargando && !error && reportes.length === 0 && <Text>No hay reportes disponibles.</Text>}
      {reportes.map((reporte) => {
        const nombre = reporte.descripcion || reporte.tipo || reporte.id;
        return (
          <View key={reporte.id} style={panel.card}>
            <Text style={panel.heading}>{nombre}</Text>
            {reporte.tipo && reporte.tipo !== nombre && <Text>{reporte.tipo}</Text>}
            <Text>{lugarDeReporte(reporte)}</Text>
            <Text>Estado: {reporte.estado}</Text>
            {SIGUIENTE_ESTADO.has(reporte.estado) && (
              <Boton label={`Cambiar estado de ${nombre}`} disabled={bloqueado || conflicto || !!seleccion}
                onPress={() => { setError(''); setSeleccion(reporte); }}>
                Cambiar estado
              </Boton>
            )}
            {seleccion?.id === reporte.id && (
              <View style={panel.selector}>
                {confirmando ? (
                  <>
                    <Text>{`¿Cambiar el estado a «${siguiente}»?`}</Text>
                    <Boton label="Confirmar cambio de estado" primary disabled={actualizando} onPress={confirmarCambio}>
                      {actualizando ? 'Guardando cambio…' : 'Confirmar cambio de estado'}
                    </Boton>
                  </>
                ) : <Boton label={siguiente} onPress={() => setConfirmando(true)} />}
                <Boton label="Cancelar" disabled={actualizando} onPress={cerrarSelector} />
              </View>
            )}
          </View>
        );
      })}
      {cursor && !conflicto && <Boton label="Cargar más reportes" disabled={bloqueado || !!seleccion} onPress={() => cargar(cursor)} />}
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
