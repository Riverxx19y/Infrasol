import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ auth: { currentUser: { uid: 'ciudadano-1' } }, db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => ({ name })),
  query: jest.fn((reference, ...constraints) => ({ reference, constraints })),
  where: jest.fn((...args) => ({ where: args })),
  orderBy: jest.fn((...args) => ({ orderBy: args })),
  limit: jest.fn((count) => ({ limit: count })),
  startAfter: jest.fn((snapshot) => ({ startAfter: snapshot })),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
}));

const { auth } = require('../../config/firebase');

// La ausencia del archivo es el fallo RED esperado; otros errores de importación siguen visibles.
const implementation = existsSync(join(__dirname, 'misReportes.service.js'))
  ? require('./misReportes.service')
  : {};
const obtenerMisReportes = implementation.obtenerMisReportes;

const snapshot = (rows) => ({ docs: rows.map(([id, data]) => ({ id, data: () => data })) });
const report = (id, estado = 'Pendiente') => [id, {
  tipo: 'Alumbrado', descripcion: `Descripción ${id}`, lugar: `Lugar ${id}`,
  lat: 9.3, lng: -75.4, usuarioId: 'ciudadano-1', estado, fotoUrl: null,
}];
const page = (prefix, count) => Array.from({ length: count }, (_, i) => report(`${prefix}${i}`));

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'ciudadano-1' };
  getDocs.mockResolvedValue(snapshot([]));
});

test('consulta la colección reportes filtrando por el UID autenticado', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  await obtenerMisReportes();
  expect(collection).toHaveBeenCalledWith(expect.anything(), 'reportes');
  expect(where).toHaveBeenCalledWith('usuarioId', '==', 'ciudadano-1');
  expect(getDocs).toHaveBeenCalledTimes(1);
});

test('ignora cualquier UID recibido como parámetro y usa solo auth.currentUser.uid', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  await obtenerMisReportes({ uid: 'otro-ciudadano', usuarioId: 'otro-ciudadano' });
  expect(where).toHaveBeenCalledWith('usuarioId', '==', 'ciudadano-1');
  expect(where).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'otro-ciudadano');
});

test('sin sesión falla antes de acceder a Firestore', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  auth.currentUser = null;
  await expect(obtenerMisReportes()).rejects.toThrow();
  expect(collection).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  expect(getDocs).not.toHaveBeenCalled();
});

test('ordena por fecha descendente y limita cada página a 25 documentos', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  await obtenerMisReportes();
  expect(orderBy).toHaveBeenCalledWith('fecha', 'desc');
  expect(limit).toHaveBeenCalledWith(25);
  expect(limit.mock.calls.every(([count]) => count > 0 && count <= 25)).toBe(true);
  const constraints = query.mock.calls[0].slice(1);
  expect(constraints).toEqual(expect.arrayContaining([
    { where: ['usuarioId', '==', 'ciudadano-1'] },
    { orderBy: ['fecha', 'desc'] },
    { limit: 25 },
  ]));
  expect(startAfter).not.toHaveBeenCalled();
});

test('carga solo una página por llamada e indica si hay más resultados', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  const firstPage = page('a', 25);
  getDocs.mockResolvedValueOnce(snapshot(firstPage));
  const result = await obtenerMisReportes();
  expect(getDocs).toHaveBeenCalledTimes(1);
  expect(result.reportes).toHaveLength(25);
  expect(result.hayMas).toBe(true);
  expect(result.cursor).toEqual(expect.objectContaining({ id: 'a24' }));
});

test('carga la página siguiente con startAfter a partir del cursor recibido', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  getDocs.mockResolvedValueOnce(snapshot(page('a', 25)));
  const first = await obtenerMisReportes();

  getDocs.mockResolvedValueOnce(snapshot([report('b0', 'Resuelto')]));
  const second = await obtenerMisReportes({ cursor: first.cursor });

  expect(startAfter).toHaveBeenCalledWith(first.cursor);
  expect(where).toHaveBeenLastCalledWith('usuarioId', '==', 'ciudadano-1');
  expect(second.reportes.map((r) => r.id)).toEqual(['b0']);
  expect(second.hayMas).toBe(false);
});

test('conserva el identificador de cada documento junto con sus datos', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  getDocs.mockResolvedValueOnce(snapshot([report('r1')]));
  const { reportes } = await obtenerMisReportes();
  expect(reportes).toEqual([{ id: 'r1', ...report('r1')[1] }]);
});

test('incluye reportes Pendiente y Resuelto sin filtrar por estado', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  getDocs.mockResolvedValueOnce(snapshot([report('r1', 'Pendiente'), report('r2', 'Resuelto')]));
  const { reportes } = await obtenerMisReportes();
  expect(reportes.map((r) => r.estado)).toEqual(['Pendiente', 'Resuelto']);
  expect(where).not.toHaveBeenCalledWith('estado', expect.anything(), expect.anything());
});

test('una colección vacía devuelve un resultado vacío sin más páginas', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  await expect(obtenerMisReportes()).resolves.toEqual(
    expect.objectContaining({ reportes: [], hayMas: false }),
  );
});

test('propaga los errores de Firestore', async () => {
  expect(obtenerMisReportes).toEqual(expect.any(Function));
  getDocs.mockRejectedValueOnce(new Error('Firestore no disponible'));
  await expect(obtenerMisReportes()).rejects.toThrow('Firestore no disponible');
});
