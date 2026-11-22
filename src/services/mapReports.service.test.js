import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => ({ name })),
  query: jest.fn((reference, ...constraints) => ({ reference, constraints })),
  where: jest.fn((...args) => ({ where: args })),
  orderBy: jest.fn((...args) => ({ orderBy: args })),
  limit: jest.fn((count) => ({ limit: count })),
  startAfter: jest.fn((snapshot) => ({ startAfter: snapshot })),
  getDocs: jest.fn(),
}));

// La ausencia del archivo es el fallo RED esperado; otros errores de importación siguen visibles.
const implementation = existsSync(join(__dirname, 'mapReports.service.js'))
  ? require('./mapReports.service')
  : {};
const obtenerReportesActivos = implementation.obtenerReportesActivos;

const snapshot = (rows) => ({ docs: rows.map(([id, data]) => ({ id, data: () => data })) });
const pending = (id) => [id, { tipo: 'Vías', estado: 'Pendiente', lat: 9.3, lng: -75.4 }];

beforeEach(() => {
  jest.clearAllMocks();
  getDocs.mockResolvedValue(snapshot([]));
});

test('consulta reportes Pendiente en Firestore y conserva sus IDs', async () => {
  expect(obtenerReportesActivos).toEqual(expect.any(Function));
  getDocs.mockResolvedValueOnce(snapshot([pending('r1')]));
  const result = await obtenerReportesActivos();
  expect(collection).toHaveBeenCalledWith(expect.anything(), 'reportes');
  expect(where).toHaveBeenCalledWith('estado', '==', 'Pendiente');
  expect(result).toEqual([{ id: 'r1', ...pending('r1')[1] }]);
});

test('la consulta excluye Resuelto antes de leer documentos', async () => {
  expect(obtenerReportesActivos).toEqual(expect.any(Function));
  await obtenerReportesActivos();
  expect(where).toHaveBeenCalledWith('estado', '==', 'Pendiente');
  expect(query).toHaveBeenCalled();
  expect(getDocs).toHaveBeenCalled();
});

test('pagina más allá de 20 reportes sin límite global heredado', async () => {
  expect(obtenerReportesActivos).toEqual(expect.any(Function));
  const firstPage = Array.from({ length: 25 }, (_, i) => pending(`r${i}`));
  getDocs.mockResolvedValueOnce(snapshot(firstPage)).mockResolvedValueOnce(snapshot([pending('r25')]));
  const result = await obtenerReportesActivos();
  expect(result).toHaveLength(26);
  expect(startAfter).toHaveBeenCalledWith(expect.objectContaining({ id: 'r24' }));
  expect(limit).toHaveBeenCalledWith(25);
  expect(orderBy).toHaveBeenCalledWith('fecha', 'desc');
});

test('devuelve una lista vacía cuando no hay reportes', async () => {
  expect(obtenerReportesActivos).toEqual(expect.any(Function));
  await expect(obtenerReportesActivos()).resolves.toEqual([]);
});

test('propaga errores de Firestore para que la pantalla muestre el estado de error', async () => {
  expect(obtenerReportesActivos).toEqual(expect.any(Function));
  getDocs.mockRejectedValueOnce(new Error('Firestore no disponible'));
  await expect(obtenerReportesActivos()).rejects.toThrow('Firestore no disponible');
});
