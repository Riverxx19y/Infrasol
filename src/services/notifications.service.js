import { collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

function currentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Inicia sesión para consultar tus notificaciones.');
  return uid;
}

export function suscribirNotificaciones(onData, onError) {
  const uid = currentUid();
  const notices = query(collection(db, 'notificaciones'), where('usuarioId', '==', uid), orderBy('fecha', 'desc'));
  return onSnapshot(notices, (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function marcarNotificacionLeida(id) {
  const uid = currentUid();
  if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('La notificación no es válida.');
  const reference = doc(db, 'notificaciones', id);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('No puedes marcar esta notificación.');
  const notification = snapshot.data();
  if (notification.usuarioId !== uid) {
    throw new Error('No puedes marcar esta notificación.');
  }
  if (notification.leida === true) return;
  await updateDoc(reference, { leida: true });
}
