import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { esCorreoValido } from './auth.validation';

function requireGateway(gateway, operation) {
  if (typeof gateway?.[operation] !== 'function') {
    throw new Error('El servicio de verificación de correo aún no está configurado.');
  }
}

export async function registrarCiudadano({ nombre, email, password } = {}, gateway) {
  const cleanName = nombre?.trim();
  const cleanEmail = email?.trim();

  if (!cleanName || !cleanEmail || !password) {
    throw new Error('Completa los campos obligatorios del registro.');
  }
  if (!esCorreoValido(cleanEmail)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos seis caracteres.');
  }
  requireGateway(gateway, 'solicitarCodigo');

  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const { uid } = credential.user;
  await setDoc(doc(db, 'usuarios', uid), {
    uid,
    nombre: cleanName,
    email: cleanEmail,
    rol: 'ciudadano',
    emailVerificado: false,
  });

  await gateway.solicitarCodigo({ uid });
  return credential.user;
}

export async function verificarCodigo(uid, codigo, gateway) {
  if (!uid || !/^\d{6}$/.test(codigo)) {
    throw new Error('Ingresa un código de seis dígitos.');
  }
  requireGateway(gateway, 'verificarCodigo');
  return gateway.verificarCodigo({ uid, codigo });
}

export async function reenviarCodigo(uid, gateway) {
  if (!uid) throw new Error('No hay una cuenta pendiente de verificación.');
  requireGateway(gateway, 'reenviarCodigo');
  return gateway.reenviarCodigo({ uid });
}

export function puedeAcceder(usuario, perfil) {
  return Boolean(usuario?.uid && perfil?.emailVerificado === true);
}
