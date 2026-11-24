import { sendPasswordResetEmail } from 'firebase/auth';

jest.mock('../../config/firebase', () => ({ auth: { name: 'test-auth' } }));
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('HU-11: validarCorreo', () => {
  test('devuelve el correo sin espacios cuando es válido', () => {
    const { validarCorreo } = require('./auth.validation');
    expect(validarCorreo('  ana@example.test  ')).toBe('ana@example.test');
  });

  test.each([undefined, null, '', '   '])('rechaza un correo vacío (%p)', (email) => {
    const { validarCorreo } = require('./auth.validation');
    expect(() => validarCorreo(email)).toThrow('Ingresa tu correo electrónico.');
  });

  test.each(['ana', 'ana@', 'ana@example', '@example.test', 'ana @example.test'])(
    'rechaza el formato inválido %p', (email) => {
      const { validarCorreo } = require('./auth.validation');
      expect(() => validarCorreo(email)).toThrow('Ingresa un correo electrónico válido.');
    },
  );

  test('HU-02 regresión: validarCredenciales mantiene sus mensajes', () => {
    const { validarCredenciales } = require('./auth.validation');
    expect(() => validarCredenciales('', '')).toThrow('Completa el correo y la contraseña.');
    expect(() => validarCredenciales('ana', 'Clave123')).toThrow('Ingresa un correo electrónico válido.');
    expect(validarCredenciales(' ana@example.test ', 'Clave123')).toBe('ana@example.test');
  });
});

describe('HU-11: solicitarRecuperacion', () => {
  test('solicita a Firebase el enlace de restablecimiento con el correo limpio', async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    const { solicitarRecuperacion } = require('./auth.service');

    await expect(solicitarRecuperacion('  ana@example.test  ')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({ name: 'test-auth' }, 'ana@example.test');
  });

  test.each([
    ['', 'Ingresa tu correo electrónico.'],
    ['   ', 'Ingresa tu correo electrónico.'],
    ['correo-invalido', 'Ingresa un correo electrónico válido.'],
  ])(
    'rechaza %p sin contactar a Firebase', async (email, message) => {
      const { solicitarRecuperacion } = require('./auth.service');
      await expect(solicitarRecuperacion(email)).rejects.toThrow(message);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    },
  );

  test('no revela si la cuenta existe: auth/user-not-found se resuelve igual que un envío', async () => {
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error('Firebase: Error (auth/user-not-found).'), { code: 'auth/user-not-found' }),
    );
    const { solicitarRecuperacion } = require('./auth.service');

    await expect(solicitarRecuperacion('nadie@example.test')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  test.each(['auth/network-request-failed', 'auth/too-many-requests'])(
    'propaga %s para que la pantalla informe el problema', async (code) => {
      sendPasswordResetEmail.mockRejectedValue(Object.assign(new Error(code), { code }));
      const { solicitarRecuperacion } = require('./auth.service');

      await expect(solicitarRecuperacion('ana@example.test')).rejects.toMatchObject({ code });
    },
  );
});
