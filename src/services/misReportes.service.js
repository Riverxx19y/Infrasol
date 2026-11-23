import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

export const PAGE_SIZE = 25;

// Devuelve una página del historial del ciudadano autenticado.
// El UID sale siempre de la sesión: nunca se acepta uno recibido por parámetro.
export async function obtenerMisReportes({ cursor } = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión para ver tus reportes.');

  const constraints = [where('usuarioId', '==', uid), orderBy('fecha', 'desc'), limit(PAGE_SIZE)];
  if (cursor) constraints.push(startAfter(cursor));
  const page = await getDocs(query(collection(db, 'reportes'), ...constraints));

  return {
    reportes: page.docs.map((document) => ({ id: document.id, ...document.data() })),
    cursor: page.docs[page.docs.length - 1] ?? null,
    hayMas: page.docs.length === PAGE_SIZE,
  };
}
