import { where } from 'firebase/firestore';
import { consultarPaginaReportes } from './reportesPage';

// El mapa necesita todos los reportes activos: recorre las páginas hasta agotarlas.
export async function obtenerReportesActivos() {
  const reportes = [];
  let cursor = null;
  let hayMas = true;

  while (hayMas) {
    const page = await consultarPaginaReportes([where('estado', '==', 'Pendiente')], cursor);
    reportes.push(...page.reportes);
    ({ cursor, hayMas } = page);
  }
  return reportes;
}
