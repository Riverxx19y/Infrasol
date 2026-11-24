import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { validarCorreo, validarCredenciales } from './auth.validation';

export async function iniciarSesion(email, password) {
  const cleanEmail = validarCredenciales(email, password);
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return credential.user;
}

export async function solicitarRecuperacion(email) {
  const cleanEmail = validarCorreo(email);
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (cause) {
    // No revela si la cuenta existe: se responde igual que un envío correcto.
    if (cause?.code === 'auth/user-not-found') return;
    throw cause;
  }
}
