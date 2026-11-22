import React from 'react';
import { act, create } from 'react-test-renderer';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../services/mapReports.service', () => ({ obtenerReportesActivos: jest.fn() }), { virtual: true });
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView', Marker: 'Marker', Callout: 'Callout' }), { virtual: true });

const { obtenerReportesActivos } = require('../../services/mapReports.service');
const MapScreen = existsSync(join(__dirname, 'MapScreen.js'))
  ? require('./MapScreen').default
  : null;
global.IS_REACT_ACT_ENVIRONMENT = true;

const item = {
  id: 'r1', tipo: 'Vías', descripcion: 'Hueco en la calzada', lugar: 'Calle 10',
  lat: 9.3047, lng: -75.3978, estado: 'Pendiente', usuarioId: 'u1', fotoUrl: null,
};
const visible = (tree) => JSON.stringify(tree.toJSON());

beforeEach(() => jest.clearAllMocks());

test('muestra un estado de carga mientras consulta reportes', () => {
  expect(MapScreen).toEqual(expect.any(Function));
  obtenerReportesActivos.mockReturnValue(new Promise(() => {}));
  let tree;
  act(() => { tree = create(<MapScreen onBack={() => {}} />); });
  expect(visible(tree)).toMatch(/cargando|carga/i);
  act(() => tree.unmount());
});

test('muestra un estado vacío cuando no hay reportes activos', async () => {
  expect(MapScreen).toEqual(expect.any(Function));
  obtenerReportesActivos.mockResolvedValue([]);
  let tree;
  await act(async () => { tree = create(<MapScreen onBack={() => {}} />); });
  expect(visible(tree)).toMatch(/no hay reportes|sin reportes/i);
  act(() => tree.unmount());
});

test('muestra un error de lectura sin presentar un mapa engañosamente vacío', async () => {
  expect(MapScreen).toEqual(expect.any(Function));
  obtenerReportesActivos.mockRejectedValue(new Error('Firestore no disponible'));
  let tree;
  await act(async () => { tree = create(<MapScreen onBack={() => {}} />); });
  expect(visible(tree)).toMatch(/error|no se pudieron cargar/i);
  expect(visible(tree)).not.toMatch(/no hay reportes|sin reportes/i);
  act(() => tree.unmount());
});

test('al seleccionar un marcador presenta tipo, descripción y lugar del reporte', async () => {
  expect(MapScreen).toEqual(expect.any(Function));
  obtenerReportesActivos.mockResolvedValue([item]);
  let tree;
  await act(async () => { tree = create(<MapScreen onBack={() => {}} />); });
  const marker = tree.root.findByType('Marker');
  act(() => marker.props.onPress());
  expect(visible(tree)).toContain('Vías');
  expect(visible(tree)).toContain('Hueco en la calzada');
  expect(visible(tree)).toContain('Calle 10');
  act(() => tree.unmount());
});
