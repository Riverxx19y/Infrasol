import { existsSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../config/firebase', () => ({
  auth: { currentUser: { uid: 'ciudadano-1', getIdToken: jest.fn().mockResolvedValue('test-token') } },
}));

const { auth } = require('../../config/firebase');
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000';
const implementation = existsSync(join(__dirname, 'apoyos.gateway.js'))
  ? require('./apoyos.gateway') : {};
const apoyarReporte = implementation.apoyarReporte;

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'ciudadano-1', getIdToken: jest.fn().mockResolvedValue('test-token') };
  global.fetch = jest.fn().mockResolvedValue({ status: 201, ok: true, json: async () => ({ apoyado: true, apoyos: 1 }) });
});
afterAll(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});
afterEach(() => {
  delete global.fetch;
});

test('envía el ID token y el ID de reporte sin UID ni contador controlados por cliente', async () => {
  expect(apoyarReporte).toEqual(expect.any(Function));
  await expect(apoyarReporte('reporte-1', { uid: 'intruso', apoyos: 999 })).resolves.toEqual({ apoyado: true, apoyos: 1 });
  expect(fetch).toHaveBeenCalledWith('http://192.0.2.10:3000/api/reportes/reporte-1/apoyos', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    body: '{}',
  }));
});

test('distingue el apoyo existente y conserva el contador confirmado por el servidor', async () => {
  expect(apoyarReporte).toEqual(expect.any(Function));
  fetch.mockResolvedValue({ status: 200, ok: true, json: async () => ({ apoyado: false, apoyos: 7 }) });
  await expect(apoyarReporte('reporte-1')).resolves.toEqual({ apoyado: false, apoyos: 7 });
});

test('sin sesión no envía ninguna solicitud', async () => {
  expect(apoyarReporte).toEqual(expect.any(Function));
  auth.currentUser = null;
  await expect(apoyarReporte('reporte-1')).rejects.toThrow(/sesión|inicia sesión/i);
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  [401, 'La sesión no es válida'],
  [403, 'No puedes apoyar este reporte'],
])('presenta el error HTTP %i sin confirmar apoyo', async (status, message) => {
  expect(apoyarReporte).toEqual(expect.any(Function));
  fetch.mockResolvedValue({ status, ok: false, json: async () => ({ error: { message } }) });
  await expect(apoyarReporte('reporte-1')).rejects.toThrow(message);
});

test('propaga un error de red y no fabrica un contador', async () => {
  expect(apoyarReporte).toEqual(expect.any(Function));
  fetch.mockRejectedValue(new Error('offline'));
  await expect(apoyarReporte('reporte-1')).rejects.toThrow(/conectar|red/i);
});
