export const SIN_DIRECCION = 'Ubicación sin dirección';

export const lugarDeReporte = (reporte) => reporte?.lugar || SIN_DIRECCION;

// Convierte un Timestamp de Firestore a dd/mm/aaaa.
export function formatearFecha(fecha) {
  const date = typeof fecha?.toDate === 'function' ? fecha.toDate() : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}
