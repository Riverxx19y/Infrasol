import React from 'react';
import { act, create } from 'react-test-renderer';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../../config/firebase', () => ({ auth: { currentUser: { uid: 'ciudadano-1' } }, db: {} }));
jest.mock('firebase/firestore', () => ({ getDoc: jest.fn(), getDocs: jest.fn() }));
// virtual solo mientras el servicio no exista (RED); cuando exista se simula el archivo real.
jest.mock('../../services/misReportes.service', () => ({ obtenerMisReportes: jest.fn() }), {
  virtual: !require('node:fs').existsSync(
    require('node:path').join(__dirname, '..', '..', 'services', 'misReportes.service.js'),
  ),
});

const { getDoc } = require('firebase/firestore');
const { obtenerMisReportes } = require('../../services/misReportes.service');

// La ausencia del archivo es el fallo RED esperado; otros errores de importación siguen visibles.
const MyReportsScreen = existsSync(join(__dirname, 'MyReportsScreen.js'))
  ? require('./MyReportsScreen').default
  : null;
global.IS_REACT_ACT_ENVIRONMENT = true;

const fecha = (year, month, day) => ({ toDate: () => new Date(year, month - 1, day, 10, 30) });
const reporte = (id, overrides = {}) => ({
  id,
  tipo: 'Alumbrado',
  descripcion: `Descripción ${id}`,
  lugar: `Lugar ${id}`,
  lat: 9.3047,
  lng: -75.3978,
  usuarioId: 'ciudadano-1',
  estado: 'Pendiente',
  fotoUrl: null,
  fecha: fecha(2026, 11, 20),
  ...overrides,
});
const pagina = (reportes, { cursor = null, hayMas = false } = {}) => ({ reportes, cursor, hayMas });

const visible = (tree) => JSON.stringify(tree.toJSON());
const botones = (tree) => tree.root.findAll(
  (node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function',
);
const boton = (tree, label) => botones(tree).find((node) => node.props.accessibilityLabel === label);
const ocurrencias = (texto, fragmento) => texto.split(fragmento).length - 1;

async function render(props = {}) {
  let tree;
  await act(async () => { tree = create(<MyReportsScreen onBack={() => {}} {...props} />); });
  return tree;
}

beforeEach(() => jest.clearAllMocks());

test('muestra un estado de carga mientras consulta el historial', () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockReturnValue(new Promise(() => {}));
  let tree;
  act(() => { tree = create(<MyReportsScreen onBack={() => {}} />); });
  expect(visible(tree)).toMatch(/cargando/i);
  expect(obtenerMisReportes).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

test('muestra un estado vacío cuando el ciudadano no tiene reportes', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([]));
  const tree = await render();
  expect(visible(tree)).toMatch(/no tienes reportes/i);
  expect(visible(tree)).not.toMatch(/cargando/i);
  expect(boton(tree, 'Cargar más')).toBeUndefined();
  act(() => tree.unmount());
});

test('muestra un error de lectura distinto del estado vacío', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockRejectedValue(new Error('Firestore no disponible'));
  const tree = await render();
  expect(visible(tree)).toMatch(/no se pudo cargar|no se pudieron cargar/i);
  expect(visible(tree)).not.toMatch(/no tienes reportes/i);
  act(() => tree.unmount());
});

test('lista cada reporte con tipo, lugar, fecha y estado', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([
    reporte('r1', { tipo: 'Vías', lugar: 'Calle 10 # 5-20', fecha: fecha(2026, 11, 20) }),
    reporte('r2', { tipo: 'Basuras', lugar: '', fecha: fecha(2026, 3, 7) }),
  ]));
  const tree = await render();
  const text = visible(tree);
  expect(text).toContain('Vías');
  expect(text).toContain('Calle 10 # 5-20');
  expect(text).toContain('20/11/2026');
  expect(text).toContain('Basuras');
  expect(text).toContain('Ubicación sin dirección');
  expect(text).toContain('07/03/2026');
  expect(ocurrencias(text, 'Pendiente')).toBeGreaterThanOrEqual(2);
  expect(text).not.toContain('Descripción r1');
  expect(boton(tree, 'Cargar más')).toBeUndefined();
  act(() => tree.unmount());
});

test('incluye los reportes Resuelto con su estado', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([
    reporte('r1', { tipo: 'Alcantarillado', estado: 'Resuelto' }),
  ]));
  const tree = await render();
  expect(visible(tree)).toContain('Alcantarillado');
  expect(visible(tree)).toContain('Resuelto');
  act(() => tree.unmount());
});

test('presenta los reportes en el orden entregado por la consulta', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([
    reporte('r1', { lugar: 'Primero', fecha: fecha(2026, 1, 1) }),
    reporte('r2', { lugar: 'Segundo', fecha: fecha(2026, 11, 1) }),
    reporte('r3', { lugar: 'Tercero', fecha: fecha(2026, 6, 1) }),
  ]));
  const tree = await render();
  const text = visible(tree);
  expect(text.indexOf('Primero')).toBeGreaterThan(-1);
  expect(text.indexOf('Primero')).toBeLessThan(text.indexOf('Segundo'));
  expect(text.indexOf('Segundo')).toBeLessThan(text.indexOf('Tercero'));
  act(() => tree.unmount());
});

test('al seleccionar un reporte muestra su descripción y lugar sin consultar Firestore otra vez', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([
    reporte('r1', { tipo: 'Vías', descripcion: 'Hueco profundo en la calzada', lugar: 'Calle 10' }),
  ]));
  const tree = await render();
  expect(visible(tree)).not.toContain('Hueco profundo en la calzada');
  const item = boton(tree, 'Ver reporte: Vías');
  expect(item).toBeDefined();
  act(() => item.props.onPress());
  expect(visible(tree)).toContain('Hueco profundo en la calzada');
  expect(visible(tree)).toContain('Calle 10');
  expect(getDoc).not.toHaveBeenCalled();
  expect(obtenerMisReportes).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

test('el botón Volver regresa a la pantalla inicial', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes.mockResolvedValue(pagina([]));
  const onBack = jest.fn();
  const tree = await render({ onBack });
  const back = boton(tree, 'Volver al inicio');
  expect(back).toBeDefined();
  act(() => back.props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

test('Cargar más solicita la página siguiente con el cursor y no duplica registros', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes
    .mockResolvedValueOnce(pagina(
      [reporte('r1', { lugar: 'Lugar uno' }), reporte('r2', { lugar: 'Lugar dos' })],
      { cursor: 'cursor-1', hayMas: true },
    ))
    .mockResolvedValueOnce(pagina(
      [reporte('r2', { lugar: 'Lugar dos' }), reporte('r3', { lugar: 'Lugar tres', estado: 'Resuelto' })],
      { cursor: 'cursor-2', hayMas: false },
    ));
  const tree = await render();
  expect(obtenerMisReportes).toHaveBeenCalledTimes(1);
  const loadMore = boton(tree, 'Cargar más');
  expect(loadMore).toBeDefined();

  await act(async () => { loadMore.props.onPress(); });

  expect(obtenerMisReportes).toHaveBeenCalledTimes(2);
  expect(obtenerMisReportes).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-1' }));
  const text = visible(tree);
  expect(ocurrencias(text, 'Lugar uno')).toBe(1);
  expect(ocurrencias(text, 'Lugar dos')).toBe(1);
  expect(ocurrencias(text, 'Lugar tres')).toBe(1);
  expect(text.indexOf('Lugar dos')).toBeLessThan(text.indexOf('Lugar tres'));
  expect(boton(tree, 'Cargar más')).toBeUndefined();
  act(() => tree.unmount());
});

test('un error al cargar más conserva los reportes ya mostrados', async () => {
  expect(MyReportsScreen).toEqual(expect.any(Function));
  obtenerMisReportes
    .mockResolvedValueOnce(pagina([reporte('r1', { lugar: 'Lugar uno' })], { cursor: 'cursor-1', hayMas: true }))
    .mockRejectedValueOnce(new Error('Firestore no disponible'));
  const tree = await render();
  const loadMore = boton(tree, 'Cargar más');
  expect(loadMore).toBeDefined();

  await act(async () => { loadMore.props.onPress(); });

  const text = visible(tree);
  expect(text).toContain('Lugar uno');
  expect(text).toMatch(/no se pudo cargar|no se pudieron cargar/i);
  expect(text).not.toMatch(/no tienes reportes/i);
  act(() => tree.unmount());
});
