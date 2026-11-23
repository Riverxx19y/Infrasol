import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerMisReportes } from '../services/misReportes.service';

const registrarError = (error) => {
  if (error?.code) console.error('Consulta de mis reportes:', error.code, error.message);
};

const agregarSinDuplicados = (actuales, nuevos) => {
  const ids = new Set(actuales.map((r) => r.id));
  return [...actuales, ...nuevos.filter((r) => !ids.has(r.id))];
};

// Estado y paginación del historial: la pantalla solo se ocupa de pintar.
export function useMisReportes() {
  const [status, setStatus] = useState('loading');
  const [reportes, setReportes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    obtenerMisReportes()
      .then((page) => {
        if (!mounted.current) return;
        setReportes(page.reportes);
        setCursor(page.cursor);
        setHayMas(page.hayMas);
        setStatus('ready');
      })
      .catch((error) => {
        registrarError(error);
        if (mounted.current) setStatus('error');
      });
    return () => { mounted.current = false; };
  }, []);

  const cargarMas = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await obtenerMisReportes({ cursor });
      if (!mounted.current) return;
      setReportes((actuales) => agregarSinDuplicados(actuales, page.reportes));
      setCursor(page.cursor);
      setHayMas(page.hayMas);
    } catch (error) {
      registrarError(error);
      if (mounted.current) setLoadMoreError(true);
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  return { status, reportes, hayMas, loadingMore, loadMoreError, cargarMas };
}
