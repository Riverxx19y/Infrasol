import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { coordenadasValidas } from '../utils/coordinates';

export async function crearReporte({ tipo, descripcion, lat, lng, direccion, fotoUrl } = {}) {
  const usuarioId = auth.currentUser?.uid;
  if (!usuarioId) throw new Error('Debes iniciar sesión para crear un reporte.');
  if (typeof tipo !== 'string' || !tipo.trim()) throw new Error('Selecciona un tipo de reporte.');
  if (typeof descripcion !== 'string' || !descripcion.trim()) {
    throw new Error('Escribe una descripción del problema.');
  }
  if (!coordenadasValidas(lat, lng)) throw new Error('Debes obtener coordenadas GPS válidas.');

  const payload = {
    tipo: tipo.trim(),
    descripcion: descripcion.trim(),
    lat,
    lng,
    lugar: typeof direccion === 'string' ? direccion : '',
    usuarioId,
    estado: 'Pendiente',
    fotoUrl: fotoUrl || null,
    fecha: serverTimestamp(),
  };
  const reference = await addDoc(collection(db, 'reportes'), payload);
  return reference.id;
}
