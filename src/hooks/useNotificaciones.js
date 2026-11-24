import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marcarNotificacionLeida, suscribirNotificaciones } from '../services/notifications.service';

export function useNotificaciones(uid) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [status, setStatus] = useState(uid ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const [markError, setMarkError] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(new Set());

  useEffect(() => {
    const current = ++generation.current;
    setNotificaciones([]);
    setMarkError(false);
    inFlight.current.clear();
    if (!uid) {
      setStatus('ready');
      return undefined;
    }
    setStatus('loading');
    let stop = () => {};
    try {
      stop = suscribirNotificaciones(
        (items) => {
          if (current !== generation.current) return;
          setNotificaciones(items.filter((item) => item.usuarioId === uid));
          setStatus('ready');
        },
        () => { if (current === generation.current) setStatus('error'); },
      );
    } catch {
      setStatus('error');
    }
    return () => { generation.current++; stop(); };
  }, [uid, attempt]);

  const reintentar = useCallback(() => setAttempt((value) => value + 1), []);
  const marcarLeida = useCallback(async (id) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    const current = generation.current;
    setMarkError(false);
    try {
      await marcarNotificacionLeida(id);
      if (current !== generation.current) return;
      setNotificaciones((items) => items.map((item) => item.id === id ? { ...item, leida: true } : item));
    } catch {
      if (current === generation.current) setMarkError(true);
    } finally {
      inFlight.current.delete(id);
    }
  }, []);
  const pendientes = useMemo(() => notificaciones.filter((item) =>
    item.tipo === 'cambio_estado' && item.leida !== true).length, [notificaciones]);

  return { status, notificaciones, pendientes, reintentar, marcarLeida, markError };
}
