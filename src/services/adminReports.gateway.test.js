import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { auth } from '../../config/firebase';

jest.mock('../../config/firebase', () => ({ auth: { currentUser: null } }));
const path = join(__dirname, 'adminReports.gateway.js');
const gateway = existsSync(path) ? require('./adminReports.gateway') : {};
const savedFetch = global.fetch;
const savedUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000';
  auth.currentUser = { uid: 'admin', getIdToken: jest.fn().mockResolvedValue('test-id-token') };
  global.fetch = jest.fn();
});
afterEach(() => {
  global.fetch = savedFetch;
  if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = savedUrl;
});

function reply(status, body) {
  global.fetch.mockResolvedValue({ status, ok: status < 400, json: async () => body });
}

test('lista con token y transmite el cursor opaco sin cambiarlo', async () => {
  expect(gateway.listarReportesAdmin).toEqual(expect.any(Function));
  const body = { reportes: [{ id: 'r1', estado: 'Pendiente', versionEstado: 0 }], cursor: 'next' };
  reply(200, body);
  await expect(gateway.listarReportesAdmin({ cursor: 'a+b' })).resolves.toEqual(body);
  const [url, options] = fetch.mock.calls[0];
  expect(new URL(url).pathname).toBe('/api/reportes');
  expect(new URL(url).searchParams.get('cursor')).toBe('a+b');
  expect(options).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer test-id-token' } });
});

test('envía PATCH autenticado con estado y versión; descarta campos de identidad', async () => {
  expect(gateway.cambiarEstadoReporte).toEqual(expect.any(Function));
  const body = { cambiado: true, estado: 'En revisión', versionEstado: 1 };
  reply(200, body);
  await expect(gateway.cambiarEstadoReporte('r1', {
    estadoNuevo: 'En revisión', versionEstadoEsperada: 0, rol: 'administrador', usuarioId: 'intruso',
  })).resolves.toEqual(body);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('http://192.0.2.10:3000/api/reportes/r1/estado');
  expect(options).toMatchObject({ method: 'PATCH', headers: { Authorization: 'Bearer test-id-token' } });
  expect(JSON.parse(options.body)).toEqual({ estadoNuevo: 'En revisión', versionEstadoEsperada: 0 });
});

test('sin sesión rechaza la solicitud sin acceder a la red', async () => {
  expect(gateway.listarReportesAdmin).toEqual(expect.any(Function));
  auth.currentUser = null;
  await expect(gateway.listarReportesAdmin()).rejects.toThrow(/sesión/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('expone el HTTP 409 para que el panel permita recargar', async () => {
  expect(gateway.cambiarEstadoReporte).toEqual(expect.any(Function));
  reply(409, { error: { code: 'STATE_VERSION_CONFLICT', message: 'El reporte cambió.' } });
  await expect(gateway.cambiarEstadoReporte('r1', {
    estadoNuevo: 'En revisión', versionEstadoEsperada: 0,
  })).rejects.toMatchObject({ status: 409, code: 'STATE_VERSION_CONFLICT' });
});
