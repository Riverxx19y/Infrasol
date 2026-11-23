const ESTILOS = {
  Pendiente: { fondo: '#FFF4D6', texto: '#B07D00' },
  Resuelto: { fondo: '#D6FFF0', texto: '#008A5A' },
};
const NEUTRAL = { fondo: '#F1F5F9', texto: '#64748B' };

// Estilo visual de la etiqueta de estado de un reporte. Solo "Pendiente" y "Resuelto"
// tienen color propio; cualquier otro valor usa el estilo neutral con su texto real.
export function estiloEstado(estado) {
  if (typeof estado === 'string' && Object.hasOwn(ESTILOS, estado)) {
    return { etiqueta: estado, ...ESTILOS[estado] };
  }
  const etiqueta = typeof estado === 'string' && estado.trim() ? estado : 'Sin estado';
  return { etiqueta, ...NEUTRAL };
}
