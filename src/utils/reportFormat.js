export const SIN_DIRECCION = 'Ubicación sin dirección';

export const lugarDeReporte = (reporte) => reporte?.lugar || SIN_DIRECCION;

export function formatearTasaResolucion(tasa) {
  return `${tasa.toFixed(2).replace('.', ',')} %`;
}

export function formatearApoyos(cantidad = 0) {
  return `${cantidad} ${cantidad === 1 ? 'apoyo' : 'apoyos'}`;
}

export function mensajeDeApoyo({ apoyado, apoyos }) {
  const mensaje = apoyado ? 'Apoyo registrado.' : 'Ya apoyaste este reporte.';
  return `${mensaje} ${formatearApoyos(apoyos)}.`;
}

// Convierte un Timestamp de Firestore a dd/mm/aaaa.
export function formatearFecha(fecha) {
  const date = typeof fecha?.toDate === 'function' ? fecha.toDate() : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}
