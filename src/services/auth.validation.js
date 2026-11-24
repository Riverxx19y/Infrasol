const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCorreo(email) {
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  if (!cleanEmail) {
    throw new Error('Ingresa tu correo electrónico.');
  }
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  return cleanEmail;
}

export function validarCredenciales(email, password) {
  const cleanEmail = email?.trim();
  if (!cleanEmail || !password?.trim()) {
    throw new Error('Completa el correo y la contraseña.');
  }
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  return cleanEmail;
}
