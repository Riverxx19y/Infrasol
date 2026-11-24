import { loginErrors, mensajeErrorAuth, RECOVERY_GENERIC_ERROR, recoveryErrors } from './auth.errors';

test('HU-02 regresión: el login agrupa las credenciales incorrectas en un único mensaje', () => {
  const messages = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']
    .map((code) => mensajeErrorAuth({ code }, loginErrors, 'fallback'));
  expect(new Set(messages)).toEqual(new Set(['Correo o contraseña incorrectos.']));
});

test('HU-11: recuperación y login comparten los mensajes comunes de red y correo', () => {
  for (const code of ['auth/network-request-failed', 'auth/invalid-email']) {
    expect(mensajeErrorAuth({ code }, recoveryErrors, RECOVERY_GENERIC_ERROR))
      .toBe(mensajeErrorAuth({ code }, loginErrors, 'fallback'));
  }
});

test('HU-11: la recuperación no tiene mensaje para user-not-found (no revela la cuenta)', () => {
  expect(recoveryErrors['auth/user-not-found']).toBeUndefined();
});

test.each([undefined, null, {}, { code: 'auth/internal-error' }])(
  'HU-11: un error desconocido (%p) usa el mensaje de respaldo', (cause) => {
    expect(mensajeErrorAuth(cause, recoveryErrors, RECOVERY_GENERIC_ERROR)).toBe(RECOVERY_GENERIC_ERROR);
  },
);
