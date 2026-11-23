import { where } from 'firebase/firestore';
import { consultarPaginaReportes } from './reportesPage';
import { esCandidatoCercano } from '../utils/geo';

export async function buscarReportesCercanos(criteria) {
  const filtros = [where('estado', '==', 'Pendiente'), where('tipo', '==', criteria.tipo)];
  const candidatos = [];
  let cursor = null;
  let hayMas = true;

  while (hayMas) {
    const page = await consultarPaginaReportes(filtros, cursor, { soloServidor: true });
    candidatos.push(...page.reportes.filter((item) => esCandidatoCercano(item, criteria)));
    cursor = page.cursor;
    hayMas = page.hayMas;
  }
  return candidatos;
}
