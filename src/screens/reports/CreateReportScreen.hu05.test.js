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
jest.mock('../../services/reportesCercanos.service', () => ({ buscarReportesCercanos: jest.fn() }));
jest.mock('../../services/apoyos.gateway', () => ({ apoyarReporte: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;
const candidate = { id: 'reporte-cercano', tipo: 'Alumbrado', estado: 'Pendiente', usuarioId: 'autor-1', apoyos: 2 };
const button = (tree, label) => tree.root.findAllByType(TouchableOpacity)
  .find((item) => item.props.accessibilityLabel === label);

beforeEach(() => {
  jest.clearAllMocks();
  obtenerUbicacionActual.mockResolvedValue({ latitude: 9.3047, longitude: -75.3978 });
  buscarReportesCercanos.mockReset().mockResolvedValue([candidate]);
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

test('vuelve a consultar al enviar si apareció un reporte desde la captura de GPS', async () => {
  obtenerUbicacionActual.mockResolvedValue({ latitude: 9.3226717, longitude: -75.2931700 });
  buscarReportesCercanos.mockResolvedValue([]);
  const tree = await preparedScreen();
  buscarReportesCercanos.mockResolvedValue([{
    ...candidate, descripcion: 'Luminaria en Carrera 24', lat: 9.3227059, lng: -75.2931446,
  }]);
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(crearReporte).not.toHaveBeenCalled();
    expect(button(tree, 'Ver reporte cercano 1')).toBeDefined();
    act(() => button(tree, 'Ver reporte cercano 1').props.onPress());
    expect(JSON.stringify(tree.toJSON())).toMatch(/Luminaria en Carrera 24/);
    await act(async () => { await button(tree, 'Continuar creando reporte').props.onPress(); });
    expect(crearReporte).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});

test('si falla la consulta al enviar, conserva el GPS y permite reintentar sin guardar', async () => {
  buscarReportesCercanos.mockResolvedValue([]);
  const tree = await preparedScreen();
  buscarReportesCercanos.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValue([candidate]);
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(crearReporte).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toMatch(/no se pudieron consultar los reportes cercanos/i);
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(button(tree, 'Apoyar reporte cercano')).toBeDefined();
  } finally { act(() => tree.unmount()); }
});

test('al crear muestra el reporte cercano antes de guardar otro', async () => {
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(buscarReportesCercanos).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'Alumbrado', lat: 9.3047, lng: -75.3978,
    }));
    expect(button(tree, 'Apoyar reporte cercano')).toBeDefined();
    expect(JSON.stringify(tree.toJSON())).toContain('Apoyar reporte existente');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Ya reportaste esta deficiencia');
    expect(crearReporte).not.toHaveBeenCalled();
  } finally { act(() => tree.unmount()); }
});

test('avisa del duplicado propio y permite consultar sin ofrecer autoapoyo', async () => {
  buscarReportesCercanos.mockResolvedValue([{
    ...candidate, usuarioId: 'ciudadano-1', lugar: 'Carrera 24',
  }]);
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    expect(JSON.stringify(tree.toJSON())).toContain('Ya reportaste esta deficiencia');
    expect(button(tree, 'Apoyar reporte cercano')).toBeUndefined();
    expect(crearReporte).not.toHaveBeenCalled();
    act(() => button(tree, 'Ver reporte cercano 1').props.onPress());
    expect(JSON.stringify(tree.toJSON())).toContain('Carrera 24');
    await act(async () => { await button(tree, 'Continuar creando reporte').props.onPress(); });
    expect(crearReporte).toHaveBeenCalledTimes(1);
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

test('el primer apoyo desde una coincidencia muestra el contador en singular', async () => {
  buscarReportesCercanos.mockResolvedValue([{ ...candidate, apoyos: 0 }]);
  apoyarReporte.mockResolvedValue({ apoyado: true, apoyos: 1 });
  const tree = await preparedScreen();
  try {
    await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
    await act(async () => { await button(tree, 'Apoyar reporte cercano').props.onPress(); });
    const visible = JSON.stringify(tree.toJSON());
    expect(visible).toContain('Apoyo registrado. 1 apoyo.');
    expect(visible).toContain(JSON.stringify('1 apoyo'));
    expect(crearReporte).not.toHaveBeenCalled();
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
