const commonAuthErrors = {
  'auth/invalid-email': 'Ingresa un correo electrónico válido.',
  'auth/network-request-failed': 'Sin conexión a internet. Intenta de nuevo.',
};

export const loginErrors = {
  ...commonAuthErrors,
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
};

export const recoveryErrors = {
  ...commonAuthErrors,
  'auth/missing-email': 'Ingresa tu correo electrónico.',
  'auth/too-many-requests': 'Demasiadas solicitudes. Intenta más tarde.',
};

export const RECOVERY_GENERIC_ERROR = 'No se pudo enviar la solicitud. Intenta de nuevo.';

export function mensajeErrorAuth(cause, messages, fallback) {
  return messages[cause?.code] || fallback;
}
