import { auth } from '../../config/firebase';
import * as gateway from './adminReports.gateway';

jest.mock('../../config/firebase', () => ({ auth: { currentUser: null } }));

const savedFetch = global.fetch;
const savedUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000';
  auth.currentUser = { getIdToken: jest.fn().mockResolvedValue('test-token') };
  global.fetch = jest.fn();
});
afterEach(() => {
  auth.currentUser = null;
  global.fetch = savedFetch;
  if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = savedUrl;
});

test('consulta el resumen global sin cursor y envía el Firebase ID token', async () => {
  const body = { total: 27, porEstado: { Pendiente: 26, 'En revisión': 0, Asignado: 0, Resuelto: 1 },
    tasaResolucion: 3.7, porTipo: { Vías: 27 }, topApoyados: [] };
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => body });
  expect(gateway.obtenerEstadisticasAdmin).toEqual(expect.any(Function));
  await expect(gateway.obtenerEstadisticasAdmin()).resolves.toEqual(body);
  expect(auth.currentUser.getIdToken).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('http://192.0.2.10:3000/api/reportes/estadisticas',
    expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer test-token' } }));
});

test('propaga la denegación del servidor al consultar estadísticas', async () => {
  fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { code: 'FORBIDDEN' } }) });
  expect(gateway.obtenerEstadisticasAdmin).toEqual(expect.any(Function));
  await expect(gateway.obtenerEstadisticasAdmin()).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
});
