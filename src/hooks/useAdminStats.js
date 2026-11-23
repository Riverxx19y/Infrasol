import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerEstadisticasAdmin } from '../services/adminReports.gateway';

export function useAdminStats() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const montado = useRef(false);
  const ultimaConsulta = useRef(0);

  const consultar = useCallback(async () => {
    if (!montado.current) return;
    const consulta = ++ultimaConsulta.current;
    setCargando(true);
    setError('');
    try {
      const datos = await obtenerEstadisticasAdmin();
      if (!datos || typeof datos.total !== 'number' || typeof datos.tasaResolucion !== 'number'
          || !datos.porEstado || !datos.porTipo || !Array.isArray(datos.topApoyados)) {
        throw new Error('El servidor devolvió un resumen inválido.');
      }
      if (consulta === ultimaConsulta.current) setResumen(datos);
    } catch (cause) {
      if (consulta === ultimaConsulta.current) {
        setError(`No se pudieron cargar las estadísticas. ${cause?.message || 'Intenta de nuevo.'}`);
      }
    } finally {
      if (consulta === ultimaConsulta.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    consultar();
    return () => {
      montado.current = false;
      ultimaConsulta.current++;
    };
  }, [consultar]);

  return { resumen, cargando, error, consultar };
}
