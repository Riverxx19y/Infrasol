import React from 'react';
import { act, create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
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

async function selectedReport(item = report) {
  obtenerReportesActivos.mockResolvedValue([item]);
  let tree;
  await act(async () => { tree = create(<MapScreen onBack={() => {}} />); });
  const mapContainer = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => mapContainer.props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } }));
  act(() => button(tree, 'Reporte: Alumbrado').props.onPress());
  return tree;
}

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
