import { existsSync } from 'node:fs';
import { join } from 'node:path';

const implementation = existsSync(join(__dirname, 'mapReports.js'))
  ? require('./mapReports')
  : {};
const { crearMarcadores, agruparMarcadores } = implementation;

const report = (id, tipo, lat, lng, prioridad) => ({
  id, tipo, lat, lng, estado: 'Pendiente', descripcion: `Problema ${id}`,
  ...(prioridad ? { prioridad } : {}),
});

test.each(['Alumbrado', 'Vías', 'Alcantarillado', 'Basuras', 'Zonas verdes', 'Otro'])(
  'representa el tipo actual %s con un estilo identificable', (tipo) => {
    expect(crearMarcadores).toEqual(expect.any(Function));
    const [marker] = crearMarcadores([report('r1', tipo, 9.3047, -75.3978)]);
    expect(marker.id).toBe('r1');
    expect(marker.tipo).toBe(tipo);
    expect(marker.estilo?.categoria).toBeTruthy();
  },
);

test('cada categoría tiene un estilo visual diferenciado', () => {
  expect(crearMarcadores).toEqual(expect.any(Function));
  const tipos = ['Alumbrado', 'Vías', 'Alcantarillado', 'Basuras', 'Zonas verdes', 'Otro'];
  const markers = crearMarcadores(tipos.map((tipo, i) => report(`r${i}`, tipo, 9.3, -75.4)));
  expect(new Set(markers.map((marker) => marker.estilo.categoria)).size).toBe(6);
});

test('descarta coordenadas nulas, no numéricas y fuera de rango', () => {
  expect(crearMarcadores).toEqual(expect.any(Function));
  const rows = [
    report('ok', 'Vías', 0, 0),
    report('null', 'Vías', null, -75),
    report('string', 'Vías', '9.3', -75),
    report('nan', 'Vías', NaN, -75),
    report('lat', 'Vías', 91, -75),
    report('lng', 'Vías', 9, -181),
  ];
  expect(crearMarcadores(rows).map((marker) => marker.id)).toEqual(['ok']);
});

test('diferencia Alta, Media y Baja cuando el dato existe', () => {
  expect(crearMarcadores).toEqual(expect.any(Function));
  const markers = crearMarcadores(['Alta', 'Media', 'Baja'].map((priority, i) =>
    report(`r${i}`, 'Vías', 9.3, -75.4, priority)));
  expect(markers.map((marker) => marker.estilo.prioridad)).toEqual(['Alta', 'Media', 'Baja']);
  expect(new Set(markers.map((marker) => marker.estilo.colorPrioridad)).size).toBe(3);
});

test('representa prioridad ausente de forma neutral, sin asignar Media o Baja', () => {
  expect(crearMarcadores).toEqual(expect.any(Function));
  const [marker] = crearMarcadores([report('r1', 'Vías', 9.3, -75.4)]);
  expect(marker.estilo.prioridad).toBeNull();
  expect(marker.estilo.colorPrioridad).toBeTruthy();
  const known = crearMarcadores(['Alta', 'Media', 'Baja'].map((priority, i) =>
    report(`p${i}`, 'Vías', 9.3, -75.4, priority)));
  expect(known.map((item) => item.estilo.colorPrioridad)).not.toContain(marker.estilo.colorPrioridad);
});

test('agrupa puntos cercanos e informa el conteo correcto', () => {
  expect(agruparMarcadores).toEqual(expect.any(Function));
  expect(crearMarcadores).toEqual(expect.any(Function));
  const markers = crearMarcadores([
    report('a', 'Vías', 9.3047, -75.3978),
    report('b', 'Vías', 9.3048, -75.3979),
    report('c', 'Vías', 10.5, -74.4),
  ]);
  const groups = agruparMarcadores(markers, 10);
  expect(groups).toEqual(expect.arrayContaining([expect.objectContaining({ count: 2 })]));
  expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(3);
});

test('el clúster se expande al aumentar el zoom', () => {
  expect(agruparMarcadores).toEqual(expect.any(Function));
  expect(crearMarcadores).toEqual(expect.any(Function));
  const markers = crearMarcadores([
    report('a', 'Vías', 9.3047, -75.3978),
    report('b', 'Vías', 9.3048, -75.3979),
  ]);
  expect(agruparMarcadores(markers, 10)).toHaveLength(1);
  expect(agruparMarcadores(markers, 21)).toHaveLength(2);
});
