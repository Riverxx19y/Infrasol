import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import MapScreen from './MapScreen';
import { obtenerReportesActivos } from '../../services/mapReports.service';
import { apoyarReporte } from '../../services/apoyos.gateway';

jest.mock('../../../config/firebase', () => ({ auth: { currentUser: { uid: 'ciudadano-1' } } }));
jest.mock('../../services/mapReports.service', () => ({ obtenerReportesActivos: jest.fn() }));
jest.mock('../../services/apoyos.gateway', () => ({ apoyarReporte: jest.fn() }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView' }));

global.IS_REACT_ACT_ENVIRONMENT = true;
const report = { id: 'r1', tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lugar: 'Calle 10',
  lat: 9.3047, lng: -75.3978, estado: 'Pendiente', usuarioId: 'autor-1', apoyos: 2, apoyadores: [] };
const button = (tree, label) => tree.root.findAllByType(TouchableOpacity)
  .find((item) => item.props.accessibilityLabel === label);

beforeEach(() => {
  jest.clearAllMocks();
  apoyarReporte.mockResolvedValue({ apoyado: true, apoyos: 3 });
});

async function selectedReport(item = report, region) {
  obtenerReportesActivos.mockResolvedValue(Array.isArray(item) ? item : [item]);
  let tree;
  await act(async () => { tree = create(<MapScreen onBack={() => {}} />); });
  const mapContainer = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => mapContainer.props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } }));
  if (region) act(() => tree.root.findByType('MapView').props.onRegionChangeComplete(region));
  act(() => button(tree, Array.isArray(item) ? 'Clúster de 2 reportes' : 'Reporte: Alumbrado').props.onPress());
  return tree;
}

test('los reportes superpuestos siguen agrupados y accesibles al máximo zoom', async () => {
  const region = {
    latitude: report.lat, longitude: report.lng, latitudeDelta: 0.0001, longitudeDelta: 0.0001,
  };
  const tree = await selectedReport([report, { ...report, id: 'r2' }], region);
  try {
    expect(button(tree, 'Ver reporte del clúster 1')).toBeDefined();
    expect(button(tree, 'Ver reporte del clúster 2')).toBeDefined();
  } finally { act(() => tree.unmount()); }
});

test.each([0, 0.000025])('permite abrir cada reporte de un clúster con separación %s grados', async (offset) => {
  const tree = await selectedReport([report, {
    ...report, id: 'r2', lng: report.lng + offset, descripcion: 'Segundo reporte de la Carrera 24',
  }]);
  try {
    expect(button(tree, 'Ver reporte del clúster 1')).toBeDefined();
    act(() => button(tree, 'Ver reporte del clúster 2').props.onPress());
    expect(JSON.stringify(tree.toJSON())).toMatch(/Segundo reporte de la Carrera 24/);
    await act(async () => { await button(tree, 'Apoyar reporte').props.onPress(); });
    expect(apoyarReporte).toHaveBeenCalledWith('r2');
  } finally { act(() => tree.unmount()); }
});

test('un reporte ajeno Pendiente ofrece Apoyar en su detalle del mapa', async () => {
  const tree = await selectedReport();
  try { expect(button(tree, 'Apoyar reporte')).toBeDefined(); }
  finally { act(() => tree.unmount()); }
});

test('el autor no puede apoyar su propio reporte desde el mapa', async () => {
  const foreignTree = await selectedReport();
  try { expect(button(foreignTree, 'Apoyar reporte')).toBeDefined(); }
  finally { act(() => foreignTree.unmount()); }
  const tree = await selectedReport({ ...report, usuarioId: 'ciudadano-1' });
  try { expect(button(tree, 'Apoyar reporte')).toBeUndefined(); }
  finally { act(() => tree.unmount()); }
});

test('la pantalla usa el contador devuelto por Express tras apoyar', async () => {
  const tree = await selectedReport();
  try {
    expect(button(tree, 'Apoyar reporte')).toBeDefined();
    await act(async () => { await button(tree, 'Apoyar reporte').props.onPress(); });
    expect(apoyarReporte).toHaveBeenCalledWith('r1');
    expect(JSON.stringify(tree.toJSON())).toMatch(/3 apoyos|3 personas/i);
  } finally { act(() => tree.unmount()); }
});

test.each([[1, '1 apoyo'], [2, '2 apoyos']])('muestra el contador %i en el mapa', async (apoyos, texto) => {
  const tree = await selectedReport({ ...report, apoyos });
  try {
    const textos = tree.root.findAllByType(Text).map(({ props }) => [props.children].flat().join(''));
    expect(textos).toContain(texto);
  } finally { act(() => tree.unmount()); }
});

test('ignora un toque simultáneo y permite reintentar tras un error de red', async () => {
  let rejectRequest;
  apoyarReporte.mockImplementationOnce(() => new Promise((_, reject) => { rejectRequest = reject; }))
    .mockResolvedValueOnce({ apoyado: false, apoyos: 1 });
  const tree = await selectedReport({ ...report, apoyos: 1 });
  try {
    const press = button(tree, 'Apoyar reporte').props.onPress;
    act(() => { press(); press(); });
    expect(apoyarReporte).toHaveBeenCalledTimes(1);
    expect(button(tree, 'Apoyar reporte').props.disabled).toBe(true);
    await act(async () => { rejectRequest(new Error('Sin conexión')); });
    expect(JSON.stringify(tree.toJSON())).toContain('Sin conexión');
    await act(async () => { await button(tree, 'Apoyar reporte').props.onPress(); });
    expect(apoyarReporte).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(tree.toJSON())).toContain('Ya apoyaste este reporte. 1 apoyo.');
  } finally { act(() => tree.unmount()); }
});
