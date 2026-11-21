jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  deleteDoc: jest.fn(),
  doc: jest.fn((database, collection, id) => ({ collection, id })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));

const { createUserWithEmailAndPassword } = require('firebase/auth');
const { deleteDoc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const uid = 'ciudadano-1';
const email = 'persona@example.test';
const password = 'ClaveSegura123';
const now = new Date('2026-11-20T12:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(now);
  createUserWithEmailAndPassword.mockResolvedValue({ user: { uid, email } });
  setDoc.mockResolvedValue();
  updateDoc.mockResolvedValue();
  deleteDoc.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

test('rechaza campos obligatorios inválidos antes de crear una cuenta', async () => {
  const { registrarCiudadano } = require('./registration.service');

  await expect(registrarCiudadano({ nombre: '', email, password }, jest.fn()))
    .rejects.toThrow();
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
});

test('registra al ciudadano sin verificar y envía un OTP de seis dígitos', async () => {
  const { registrarCiudadano } = require('./registration.service');
  const enviarCodigo = jest.fn().mockResolvedValue();

  await registrarCiudadano({ nombre: 'Ana Pérez', email, password }, enviarCodigo);

  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), email, password);
  expect(setDoc).toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    expect.objectContaining({ email, emailVerificado: false }),
  );
  expect(setDoc).toHaveBeenCalledWith(
    { collection: 'verificaciones', id: uid },
    expect.objectContaining({ codigo: expect.stringMatching(/^\d{6}$/), intentos: 0 }),
  );
  expect(enviarCodigo).toHaveBeenCalledWith(
    expect.objectContaining({ email, codigo: expect.stringMatching(/^\d{6}$/) }),
  );
});

test('acepta el OTP vigente y marca el correo como verificado', async () => {
  const { verificarCodigo } = require('./registration.service');
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ codigo: '123456', intentos: 0, creadoEn: { toMillis: () => now.getTime() } }),
  });

  await verificarCodigo(uid, '123456');

  expect(updateDoc).toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    { emailVerificado: true },
  );
  expect(deleteDoc).toHaveBeenCalledWith({ collection: 'verificaciones', id: uid });
});

test('rechaza el OTP después de quince minutos sin verificar el correo', async () => {
  const { verificarCodigo } = require('./registration.service');
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ codigo: '123456', intentos: 0, creadoEn: { toMillis: () => now.getTime() } }),
  });
  jest.setSystemTime(new Date(now.getTime() + 15 * 60 * 1000 + 1));

  await expect(verificarCodigo(uid, '123456')).rejects.toThrow(/expir/i);
  expect(updateDoc).not.toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    { emailVerificado: true },
  );
});

test('cuenta intentos incorrectos y bloquea el sexto intento', async () => {
  const { verificarCodigo } = require('./registration.service');
  let intentos = 0;
  getDoc.mockImplementation(async () => ({
    exists: () => true,
    data: () => ({ codigo: '123456', intentos, creadoEn: { toMillis: () => now.getTime() } }),
  }));
  updateDoc.mockImplementation(async (reference, changes) => {
    if (reference.collection === 'verificaciones') intentos = changes.intentos;
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expect(verificarCodigo(uid, '000000')).rejects.toThrow();
  }
  expect(intentos).toBe(5);
  await expect(verificarCodigo(uid, '123456')).rejects.toThrow(/intentos/i);
  expect(updateDoc).not.toHaveBeenCalledWith(
    { collection: 'usuarios', id: uid },
    { emailVerificado: true },
  );
});

test('reenvía un código nuevo e invalida el anterior', async () => {
  const { reenviarCodigo } = require('./registration.service');
  const enviarCodigo = jest.fn().mockResolvedValue();
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ codigo: '123456', intentos: 5, creadoEn: { toMillis: () => now.getTime() - 61_000 } }),
  });

  await reenviarCodigo({ uid, email }, enviarCodigo);

  expect(setDoc).toHaveBeenCalledWith(
    { collection: 'verificaciones', id: uid },
    expect.objectContaining({ codigo: expect.stringMatching(/^\d{6}$/), intentos: 0 }),
  );
  const replacement = setDoc.mock.calls.find(([reference]) => reference.collection === 'verificaciones')[1];
  expect(replacement.codigo).not.toBe('123456');
  expect(enviarCodigo).toHaveBeenCalledWith(
    expect.objectContaining({ email, codigo: replacement.codigo }),
  );
});

test('bloquea el acceso hasta que el perfil indique correo verificado', () => {
  const { puedeAcceder } = require('./registration.service');

  expect(puedeAcceder({ uid }, { emailVerificado: false })).toBe(false);
  expect(puedeAcceder({ uid }, null)).toBe(false);
  expect(puedeAcceder({ uid }, { emailVerificado: true })).toBe(true);
});
