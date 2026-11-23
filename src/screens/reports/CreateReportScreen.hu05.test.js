import React from 'react';
import { act, create } from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import CreateReportScreen from './CreateReportScreen';
import { obtenerUbicacionActual } from '../../services/location.service';
import { crearReporte } from '../../services/reports.service';
import { buscarReportesCercanos } from '../../services/reportesCercanos.service';
import { apoyarReporte } from '../../services/apoyos.gateway';

jest.mock('../../services/location.service', () => ({ obtenerUbicacionActual: jest.fn() }));
jest.mock('../../services/reports.service', () => ({ crearReporte: jest.fn() }));
jest.mock('../../services/photo.service', () => ({ subirFoto: jest.fn() }));
jest.mock('../../services/reportesCercanos.service', () => ({ buscarReportesCercanos: jest.fn() }), { virtual: true });
jest.mock('../../services/apoyos.gateway', () => ({ apoyarReporte: jest.fn() }), { virtual: true });

global.IS_REACT_ACT_ENVIRONMENT = true;
const candidate = { id: 'reporte-cercano', tipo: 'Alumbrado', estado: 'Pendiente', usuarioId: 'autor-1', apoyos: 2 };
const button = (tree, label) => tree.root.findAllByType(TouchableOpacity)
  .find((item) => item.props.accessibilityLabel === label);

beforeEach(() => {
  jest.clearAllMocks();
  obtenerUbicacionActual.mockResolvedValue({ latitude: 9.3047, longitude: -75.3978 });
  buscarReportesCercanos.mockResolvedValue([candidate]);
  apoyarReporte.mockResolvedValue({ apoyado: true, apoyos: 3 });
  crearReporte.mockResolvedValue('nuevo-reporte');
});

async function preparedScreen() {
  let tree;
  act(() => { tree = create(<CreateReportScreen user={{ uid: 'ciudadano-1' }} />); });
  act(() => {
    button(tree, 'Alumbrado').props.onPress();
    tree.root.findAllByType(TextInput).find((input) => input.props.accessibilityLabel === 'Descripción')
      .props.onChangeText('Luminaria apagada');
  });
  await act(async () => { await button(tree, 'Obtener ubicación').props.onPress(); });
  return tree;
}

test('al crear muestra el reporte cercano antes de guardar otro', async () => {
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(buscarReportesCercanos).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'Alumbrado', lat: 9.3047, lng: -75.3978,
    }));
    expect(button(tree, 'Apoyar reporte cercano')).toBeDefined();
    expect(crearReporte).not.toHaveBeenCalled();
  } finally { act(() => tree.unmount()); }
});

test('apoyar el candidato comunica el contador confirmado por la API', async () => {
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(button(tree, 'Apoyar reporte cercano')).toBeDefined();
    await act(async () => { await button(tree, 'Apoyar reporte cercano').props.onPress(); });
    expect(apoyarReporte).toHaveBeenCalledWith(candidate.id);
    expect(JSON.stringify(tree.toJSON())).toMatch(/3 apoyos|3 personas/i);
  } finally { act(() => tree.unmount()); }
});

test('si ya había apoyado informa ese estado sin incrementar localmente', async () => {
  apoyarReporte.mockResolvedValue({ apoyado: false, apoyos: 2 });
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(button(tree, 'Apoyar reporte cercano')).toBeDefined();
    await act(async () => { await button(tree, 'Apoyar reporte cercano').props.onPress(); });
    expect(JSON.stringify(tree.toJSON())).toMatch(/ya apoyaste|apoyo existente/i);
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/3 apoyos/i);
  } finally { act(() => tree.unmount()); }
});
