import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { where } from 'firebase/firestore';
import { consultarPaginaReportes } from './reportesPage';
import { esCandidatoCercano } from '../utils/geo';

jest.mock('firebase/firestore', () => ({ where: jest.fn((...args) => ({ where: args })) }));
jest.mock('./reportesPage', () => ({ consultarPaginaReportes: jest.fn() }));
jest.mock('../utils/geo', () => ({ esCandidatoCercano: jest.fn() }), { virtual: true });

const implementation = existsSync(join(__dirname, 'reportesCercanos.service.js'))
  ? require('./reportesCercanos.service') : {};
const buscarReportesCercanos = implementation.buscarReportesCercanos;
const criteria = { tipo: 'Alumbrado', lat: 9.3047, lng: -75.3978, uid: 'ciudadano-1' };
const report = (id, extra = {}) => ({
  id, tipo: 'Alumbrado', estado: 'Pendiente', usuarioId: 'autor-1', lat: 9.3047, lng: -75.3978, ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  esCandidatoCercano.mockImplementation((item, search) => item.tipo === search.tipo
    && item.estado === 'Pendiente' && item.usuarioId !== search.uid && item.cerca !== false);
});

test('consulta solo la categoría exacta y estado Pendiente usando el paginador común', async () => {
  expect(buscarReportesCercanos).toEqual(expect.any(Function));
  consultarPaginaReportes.mockResolvedValue({ reportes: [report('r1')], cursor: null, hayMas: false });
  await expect(buscarReportesCercanos(criteria)).resolves.toEqual([report('r1')]);
  expect(where).toHaveBeenCalledWith('estado', '==', 'Pendiente');
  expect(where).toHaveBeenCalledWith('tipo', '==', 'Alumbrado');
  expect(consultarPaginaReportes).toHaveBeenCalledTimes(1);
});

test('revisa páginas de 25 y encuentra un candidato después de los primeros 20', async () => {
  expect(buscarReportesCercanos).toEqual(expect.any(Function));
  const first = Array.from({ length: 25 }, (_, index) => report(`r${index}`, { cerca: false }));
  const cursor = { id: 'r24' };
  consultarPaginaReportes
    .mockResolvedValueOnce({ reportes: first, cursor, hayMas: true })
    .mockResolvedValueOnce({ reportes: [report('r25')], cursor: null, hayMas: false });
  await expect(buscarReportesCercanos(criteria)).resolves.toEqual([report('r25')]);
  expect(consultarPaginaReportes).toHaveBeenCalledTimes(2);
  expect(consultarPaginaReportes.mock.calls[1][1]).toBe(cursor);
});

test('descarta estado, categoría y autor incorrectos aunque aparezcan en una página', async () => {
  expect(buscarReportesCercanos).toEqual(expect.any(Function));
  consultarPaginaReportes.mockResolvedValue({
    reportes: [report('r1'), report('r2', { estado: 'Resuelto' }),
      report('r3', { tipo: 'Vías' }), report('r4', { usuarioId: 'ciudadano-1' })],
    cursor: null, hayMas: false,
  });
  await expect(buscarReportesCercanos(criteria)).resolves.toEqual([report('r1')]);
});

test('propaga un error de consulta sin presentar un resultado vacío', async () => {
  expect(buscarReportesCercanos).toEqual(expect.any(Function));
  consultarPaginaReportes.mockRejectedValue(new Error('Firestore no disponible'));
  await expect(buscarReportesCercanos(criteria)).rejects.toThrow('Firestore no disponible');
});
