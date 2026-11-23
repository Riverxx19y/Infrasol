import { useCallback, useEffect, useRef, useState } from 'react';
import { cambiarEstadoReporte, listarReportesAdmin } from '../services/adminReports.gateway';

export function useAdminReports() {
  const [reportes, setReportes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [operacion, setOperacion] = useState('carga');
  const [seleccion, setSeleccion] = useState(null);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const ocupado = useRef(false);

  const cargar = useCallback(async (pagina) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setOperacion('carga');
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
      setOperacion(null);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function seleccionar(reporte, estadoNuevo) {
    if (ocupado.current || !estadoNuevo || seleccion || conflicto) return;
    setError('');
    setSeleccion({ reporte, estadoNuevo, confirmando: false });
  }

  function prepararConfirmacion() {
    setSeleccion((actual) => actual && { ...actual, confirmando: true });
  }

  function cerrarSelector() {
    setSeleccion(null);
  }

  async function confirmarCambio() {
    if (ocupado.current || !seleccion?.confirmando || conflicto) return;
    const { reporte, estadoNuevo } = seleccion;
    ocupado.current = true;
    setOperacion('cambio');
    setError('');
    try {
      const { estado, versionEstado } = await cambiarEstadoReporte(reporte.id, {
        estadoNuevo, versionEstadoEsperada: reporte.versionEstado ?? 0,
      });
      setReportes((actuales) => actuales.map((actual) => actual.id === reporte.id
        ? { ...actual, estado, versionEstado }
        : actual));
    } catch (cause) {
      const esConflicto = cause?.status === 409;
      setConflicto(esConflicto);
      setError(esConflicto
        ? `Conflicto de estado. ${cause.message || 'Recarga los reportes.'}`
        : cause?.message || 'No se pudo actualizar el estado.');
    } finally {
      cerrarSelector();
      ocupado.current = false;
      setOperacion(null);
    }
  }

  return {
    reportes, cursor, seleccion, error, conflicto, errorCarga,
    cargando: operacion === 'carga',
    actualizando: operacion === 'cambio',
    cargar, seleccionar, prepararConfirmacion, cerrarSelector, confirmarCambio,
  };
}
