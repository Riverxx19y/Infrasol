import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerEstadisticasAdmin } from '../services/adminReports.gateway';

export function useAdminStats() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const montado = useRef(false);
  const enCurso = useRef(null);

  const consultar = useCallback(async ({ forzar = false } = {}) => {
    if (!montado.current || (enCurso.current && !forzar)) return;
    const consulta = {};
    enCurso.current = consulta;
    setCargando(true);
    setError('');
    try {
      const datos = await obtenerEstadisticasAdmin();
      if (!datos || typeof datos.total !== 'number' || typeof datos.tasaResolucion !== 'number'
          || !datos.porEstado || !datos.porTipo || !Array.isArray(datos.topApoyados)) {
        throw new Error('El servidor devolvió un resumen inválido.');
      }
      if (enCurso.current === consulta) setResumen(datos);
    } catch (cause) {
      if (enCurso.current === consulta) {
        setError(`No se pudieron cargar las estadísticas. ${cause?.message || 'Intenta de nuevo.'}`);
      }
    } finally {
      if (enCurso.current === consulta) {
        enCurso.current = null;
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    consultar();
    return () => {
      montado.current = false;
      enCurso.current = null;
    };
  }, [consultar]);

  return { resumen, cargando, error, consultar };
}
