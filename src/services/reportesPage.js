import { collection, getDocs, getDocsFromServer, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';

// firestore.rules exige limit() <= 25 en toda consulta de la colección reportes.
export const REPORTES_PAGE_SIZE = 25;

// Lee una página de reportes (fecha DESC) aplicando los filtros recibidos.
// Devuelve el cursor para pedir la siguiente página con startAfter.
export async function consultarPaginaReportes(filtros, cursor = null, { soloServidor = false } = {}) {
  const constraints = [...filtros, orderBy('fecha', 'desc'), limit(REPORTES_PAGE_SIZE)];
  if (cursor) constraints.push(startAfter(cursor));
  const consulta = query(collection(db, 'reportes'), ...constraints);
  const page = await (soloServidor ? getDocsFromServer(consulta) : getDocs(consulta));

  return {
    reportes: page.docs.map((document) => ({ id: document.id, ...document.data() })),
    cursor: page.docs[page.docs.length - 1] ?? null,
    hayMas: page.docs.length === REPORTES_PAGE_SIZE,
  };
}
