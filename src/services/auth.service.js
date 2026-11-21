import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { validarCredenciales } from './auth.validation';

export async function iniciarSesion(email, password) {
  const cleanEmail = validarCredenciales(email, password);
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return credential.user;
}
