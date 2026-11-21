import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';

export async function iniciarSesion(email, password) {
  const cleanEmail = email?.trim();
  if (!cleanEmail || !password?.trim()) {
    throw new Error('Completa el correo y la contraseña.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }

  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return credential.user;
}
