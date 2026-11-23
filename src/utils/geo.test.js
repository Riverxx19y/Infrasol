import { existsSync } from 'node:fs';
import { join } from 'node:path';

const implementation = existsSync(join(__dirname, 'geo.js')) ? require('./geo') : {};
const distanciaMetros = implementation.distanciaMetros;
const esCandidatoCercano = implementation.esCandidatoCercano;
const candidate = { id: 'r1', tipo: 'Alumbrado', estado: 'Pendiente', usuarioId: 'autor', lat: 0, lng: 0 };

test('Haversine devuelve cero para coordenadas iguales, incluso 0,0', () => {
  expect(distanciaMetros).toEqual(expect.any(Function));
  expect(distanciaMetros(0, 0, 0, 0)).toBe(0);
});

test('Haversine aproxima 111 km por un grado en el ecuador', () => {
  expect(distanciaMetros).toEqual(expect.any(Function));
  expect(distanciaMetros(0, 0, 1, 0)).toBeGreaterThan(111000);
  expect(distanciaMetros(0, 0, 1, 0)).toBeLessThan(112000);
});

test('incluye la frontera de 150 m y excluye una distancia mayor', () => {
  expect(esCandidatoCercano).toEqual(expect.any(Function));
  const near = { ...candidate, lat: 149.999 / 6371000 * 180 / Math.PI };
  const far = { ...candidate, lat: 150.001 / 6371000 * 180 / Math.PI };
  expect(esCandidatoCercano(near, { tipo: 'Alumbrado', lat: 0, lng: 0, uid: 'otro' })).toBe(true);
  expect(esCandidatoCercano(far, { tipo: 'Alumbrado', lat: 0, lng: 0, uid: 'otro' })).toBe(false);
});

test('rechaza coordenadas inválidas y acepta ceros válidos', () => {
  expect(esCandidatoCercano).toEqual(expect.any(Function));
  expect(esCandidatoCercano(candidate, { tipo: 'Alumbrado', lat: 0, lng: 0, uid: 'otro' })).toBe(true);
  for (const lat of [undefined, NaN, 91]) {
    expect(esCandidatoCercano(candidate, { tipo: 'Alumbrado', lat, lng: 0, uid: 'otro' })).toBe(false);
  }
});

test('filtra categoría, Resuelto y reporte propio', () => {
  expect(esCandidatoCercano).toEqual(expect.any(Function));
  const search = { tipo: 'Alumbrado', lat: 0, lng: 0, uid: 'otro' };
  expect(esCandidatoCercano({ ...candidate, tipo: 'Vías' }, search)).toBe(false);
  expect(esCandidatoCercano({ ...candidate, estado: 'Resuelto' }, search)).toBe(false);
  expect(esCandidatoCercano(candidate, { ...search, uid: 'autor' })).toBe(false);
});
