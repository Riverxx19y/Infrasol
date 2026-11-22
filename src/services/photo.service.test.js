jest.mock('../../config/firebase', () => ({
  auth: { currentUser: { uid: 'citizen-1', getIdToken: jest.fn() } },
}));

const { auth } = require('../../config/firebase');
const { subirFoto } = require('./photo.service');
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const originalKey = process.env.EXPO_PUBLIC_IMGBB_API_KEY;
const originalFetch = global.fetch;
const imageBase64 = 'QUJDRA==';

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000/';
  process.env.EXPO_PUBLIC_IMGBB_API_KEY = 'never-send-this-key';
  auth.currentUser = { uid: 'citizen-1', getIdToken: jest.fn().mockResolvedValue('firebase-id-token') };
  global.fetch = jest.fn().mockResolvedValue(reply(200, { fotoUrl: 'https://i.ibb.co/reporte.jpg' }));
});

afterAll(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_IMGBB_API_KEY;
  else process.env.EXPO_PUBLIC_IMGBB_API_KEY = originalKey;
  global.fetch = originalFetch;
});

test('HU-03 RED 2: envía una fotografía al backend con ID Token y devuelve fotoUrl', async () => {
  await expect(subirFoto(`data:image/jpeg;base64,${imageBase64}`)).resolves.toBe('https://i.ibb.co/reporte.jpg');
  expect(auth.currentUser.getIdToken).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('http://192.0.2.10:3000/api/images/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer firebase-id-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  expect(JSON.stringify(fetch.mock.calls)).not.toContain('never-send-this-key');
  expect(JSON.stringify(fetch.mock.calls)).not.toContain('api.imgbb.com');
});

test('HU-03 RED 2: rechaza una respuesta HTTP fallida', async () => {
  global.fetch.mockResolvedValue(reply(503, { error: { code: 'UPLOAD_NOT_CONFIGURED', message: 'Servicio no disponible' } }));
  await expect(subirFoto(imageBase64)).rejects.toThrow(/servicio no disponible/i);
});

test('HU-03 RED 2: informa un fallo de red', async () => {
  global.fetch.mockRejectedValue(new Error('socket cerrado'));
  await expect(subirFoto(imageBase64)).rejects.toThrow(/red|conectar/i);
});

test.each([
  [{}, /URL|inválida/i],
  [{ fotoUrl: 'http://i.ibb.co/reporte.jpg' }, /URL|inválida/i],
  [{ fotoUrl: 'https://otro.test/reporte.jpg' }, /URL|inválida/i],
])('HU-03 RED 2: no acepta una respuesta sin URL válida de imagen', async (body, message) => {
  global.fetch.mockResolvedValue(reply(200, body));
  await expect(subirFoto(imageBase64)).rejects.toThrow(message);
});

test('HU-03 RED 2: no envía una fotografía si falta la URL del backend', async () => {
  delete process.env.EXPO_PUBLIC_API_URL;
  await expect(subirFoto(imageBase64)).rejects.toThrow(/EXPO_PUBLIC_API_URL/);
  expect(fetch).not.toHaveBeenCalled();
});

test('exige una sesión autenticada antes de enviar la fotografía', async () => {
  auth.currentUser = null;
  await expect(subirFoto(imageBase64)).rejects.toThrow(/inicia sesión/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('informa HTTP 401 y no acepta una sesión inválida', async () => {
  global.fetch.mockResolvedValue(reply(401, { error: { code: 'UNAUTHENTICATED' } }));
  await expect(subirFoto(imageBase64)).rejects.toThrow(/sesión|inicia sesión/i);
});

test('informa HTTP 413 y solicita una fotografía más pequeña', async () => {
  global.fetch.mockResolvedValue(reply(413, { error: { code: 'IMAGE_TOO_LARGE' } }));
  await expect(subirFoto(imageBase64)).rejects.toThrow(/más pequeña/i);
});

test('rechaza una imagen superior a 5 MiB antes de enviarla', async () => {
  const oversized = 'A'.repeat(Math.ceil((5 * 1024 * 1024 + 1) / 3) * 4);
  await expect(subirFoto(oversized)).rejects.toThrow(/5 MiB|más pequeña/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('rechaza base64 inválido y una respuesta JSON ilegible', async () => {
  await expect(subirFoto('esto-no-es-base64')).rejects.toThrow(/fotografía válida/i);
  expect(fetch).not.toHaveBeenCalled();
  global.fetch.mockResolvedValue({ ok: true, status: 200, json: jest.fn().mockRejectedValue(new Error('JSON inválido')) });
  await expect(subirFoto(imageBase64)).rejects.toThrow(/URL|inválida/i);
});
