export function validarCredenciales(email, password) {
  const cleanEmail = email?.trim();
  if (!cleanEmail || !password?.trim()) {
    throw new Error('Completa el correo y la contraseña.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  return cleanEmail;
}
