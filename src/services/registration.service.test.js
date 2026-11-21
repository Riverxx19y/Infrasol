jest.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((database, collection, id) => ({ collection, id })),
  setDoc: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));

const { createUserWithEmailAndPassword } = require('firebase/auth');
const { setDoc } = require('firebase/firestore');
const { registrarCiudadano, verificarCodigo, reenviarCodigo, puedeAcceder } = require('./registration.service');

const uid = 'ciudadano-1';
const email = 'persona@example.test';
const password = 'ClaveSegura123';

beforeEach(() => {
  jest.clearAllMocks();
  createUserWithEmailAndPassword.mockResolvedValue({ user: { uid, email } });
  setDoc.mockResolvedValue();
});

test('rechaza campos obligatorios inválidos antes de crear una cuenta', async () => {
  const gateway = { solicitarCodigo: jest.fn() };

  await expect(registrarCiudadano({ nombre: '', email, password }, gateway)).rejects.toThrow();
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
});

test('registra un perfil no verificado y solicita el OTP al módulo de correo', async () => {
  const gateway = { solicitarCodigo: jest.fn().mockResolvedValue() };

  await registrarCiudadano({ nombre: 'Ana Pérez', email, password }, gateway);

  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), email, password);
  expect(setDoc).toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    expect.objectContaining({ uid, email, rol: 'ciudadano', emailVerificado: false }),
  );
  expect(gateway.solicitarCodigo).toHaveBeenCalledWith({ uid });
  expect(setDoc).toHaveBeenCalledTimes(1);
});

test('tras fallar el envío conserva la cuenta pendiente y permite reenviar sin registrarla de nuevo', async () => {
  const gateway = {
    solicitarCodigo: jest.fn().mockRejectedValue(new Error('No se pudo enviar el código por correo.')),
    reenviarCodigo: jest.fn().mockResolvedValue({ enviado: true }),
  };

  await expect(registrarCiudadano({ nombre: 'Ana Pérez', email, password }, gateway))
    .rejects.toThrow(/No se pudo enviar/);
  expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
  expect(setDoc).toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    expect.objectContaining({ emailVerificado: false }),
  );
  await expect(reenviarCodigo(uid, gateway)).resolves.toEqual({ enviado: true });
  expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
});

test('acepta una verificación confirmada por el módulo OTP', async () => {
  const gateway = { verificarCodigo: jest.fn().mockResolvedValue({ verificado: true }) };

  await expect(verificarCodigo(uid, '123456', gateway)).resolves.toEqual({ verificado: true });

  expect(gateway.verificarCodigo).toHaveBeenCalledWith({ uid, codigo: '123456' });
  expect(setDoc).not.toHaveBeenCalled();
});

test('rechaza el OTP expirado según la respuesta del módulo OTP', async () => {
  const gateway = {
    verificarCodigo: jest.fn().mockRejectedValue(new Error('El código expiró. Solicita uno nuevo.')),
  };

  await expect(verificarCodigo(uid, '123456', gateway)).rejects.toThrow(/expir/i);
  expect(setDoc).not.toHaveBeenCalled();
});

test('respeta el bloqueo de intentos informado por el módulo OTP', async () => {
  const gateway = {
    verificarCodigo: jest.fn()
      .mockRejectedValueOnce(new Error('Código incorrecto'))
      .mockRejectedValueOnce(new Error('Código incorrecto'))
      .mockRejectedValueOnce(new Error('Código incorrecto'))
      .mockRejectedValueOnce(new Error('Código incorrecto'))
      .mockRejectedValueOnce(new Error('Código incorrecto'))
      .mockRejectedValueOnce(new Error('Demasiados intentos')),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expect(verificarCodigo(uid, '000000', gateway)).rejects.toThrow(/incorrecto/i);
  }
  await expect(verificarCodigo(uid, '123456', gateway)).rejects.toThrow(/intentos/i);
  expect(gateway.verificarCodigo).toHaveBeenCalledTimes(6);
  expect(setDoc).not.toHaveBeenCalled();
});

test('delega el reenvío y la invalidación del código anterior al módulo OTP', async () => {
  const gateway = { reenviarCodigo: jest.fn().mockResolvedValue({ enviado: true }) };

  await expect(reenviarCodigo(uid, gateway)).resolves.toEqual({ enviado: true });

  expect(gateway.reenviarCodigo).toHaveBeenCalledWith({ uid });
  expect(setDoc).not.toHaveBeenCalled();
});

test('bloquea el acceso hasta que el perfil indique correo verificado', () => {
  expect(puedeAcceder({ uid }, { emailVerificado: false })).toBe(false);
  expect(puedeAcceder({ uid }, null)).toBe(false);
  expect(puedeAcceder({ uid }, { emailVerificado: true })).toBe(true);
});
