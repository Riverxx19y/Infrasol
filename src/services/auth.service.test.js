import { signInWithEmailAndPassword } from 'firebase/auth';

jest.mock('../../config/firebase', () => ({ auth: { name: 'test-auth' } }));
jest.mock('firebase/auth', () => ({ signInWithEmailAndPassword: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('HU-02: inicia sesión con correo y contraseña de una cuenta registrada', async () => {
  const user = { uid: 'ciudadano-1', email: 'ana@example.test' };
  signInWithEmailAndPassword.mockResolvedValue({ user });

  const { iniciarSesion } = require('./auth.service');
  await expect(iniciarSesion('  ana@example.test  ', 'ClaveSegura123')).resolves.toEqual(user);
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
    { name: 'test-auth' }, 'ana@example.test', 'ClaveSegura123',
  );
});

test.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])(
  'HU-02: rechaza %s sin conceder acceso', async (code) => {
    const error = Object.assign(new Error('Credenciales incorrectas'), { code });
    signInWithEmailAndPassword.mockRejectedValue(error);

    const { iniciarSesion } = require('./auth.service');
    await expect(iniciarSesion('ana@example.test', 'incorrecta')).rejects.toMatchObject({ code });
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
  },
);
