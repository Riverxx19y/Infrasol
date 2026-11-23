import { where } from 'firebase/firestore';
import { auth } from '../../config/firebase';
import { consultarPaginaReportes } from './reportesPage';

// Devuelve una página del historial del ciudadano autenticado.
// El UID sale siempre de la sesión: nunca se acepta uno recibido por parámetro.
export async function obtenerMisReportes({ cursor } = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión para ver tus reportes.');
  return consultarPaginaReportes([where('usuarioId', '==', uid)], cursor);
}
