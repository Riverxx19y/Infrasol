import React from 'react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { act, create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

// Usa un módulo virtual solo hasta que GREEN cree el gateway.
jest.doMock('../../services/adminReports.gateway', () => ({
  cambiarEstadoReporte: jest.fn(), listarReportesAdmin: jest.fn(),
}), { virtual: !existsSync(join(__dirname, '../../services/adminReports.gateway.js')) });
const { cambiarEstadoReporte, listarReportesAdmin } = require('../../services/adminReports.gateway');
const AdminScreen = require('./AdminScreen').default;

global.IS_REACT_ACT_ENVIRONMENT = true;
const original = { id: 'r1', descripcion: 'Luminaria apagada', tipo: 'Alumbrado', estado: 'Pendiente', versionEstado: 0 };
const page = (reportes = [original], cursor = null) => ({ reportes, cursor });
const visible = (tree) => JSON.stringify(tree.toJSON());
const button = (tree, label) => tree.root.findAllByType(TouchableOpacity)
  .find(({ props }) => props.accessibilityLabel === label);

async function press(tree, label) {
  expect(button(tree, label)).toBeDefined();
  await act(async () => { await button(tree, label).props.onPress(); });
}
let tree;
async function mount() {
  await act(async () => { tree = create(<AdminScreen onSignOut={() => {}} />); });
}

beforeEach(() => {
  jest.resetAllMocks();
  listarReportesAdmin.mockResolvedValue(page());
  cambiarEstadoReporte.mockResolvedValue({ cambiado: true, estado: 'En revisión', versionEstado: 1 });
});
afterEach(() => { if (tree) act(() => { tree.unmount(); tree = undefined; }); });

test('muestra el estado actual y conserva ambas páginas al cargar más', async () => {
  listarReportesAdmin.mockResolvedValueOnce(page([original], 'next'))
    .mockResolvedValueOnce(page([{ ...original, id: 'r2', descripcion: 'Bache en la vía' }]));
  await mount();
  expect(visible(tree)).toContain('Luminaria apagada');
  expect(visible(tree)).toContain('Pendiente');
  await press(tree, 'Cargar más reportes');
  expect(listarReportesAdmin).toHaveBeenLastCalledWith({ cursor: 'next' });
  expect(visible(tree)).toContain('Luminaria apagada');
  expect(visible(tree)).toContain('Bache en la vía');
});

test('solo ofrece el siguiente estado y lo muestra tras confirmar y recibir respuesta', async () => {
  let finish;
  cambiarEstadoReporte.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await mount();
  await press(tree, 'Cambiar estado de Luminaria apagada');
  expect(button(tree, 'Asignado')).toBeUndefined();
  expect(button(tree, 'Resuelto')).toBeUndefined();
  await press(tree, 'En revisión');
  expect(cambiarEstadoReporte).not.toHaveBeenCalled();
  expect(button(tree, 'Confirmar cambio de estado')).toBeDefined();
  await act(async () => { button(tree, 'Confirmar cambio de estado').props.onPress(); });
  expect(cambiarEstadoReporte).toHaveBeenCalledWith('r1', { estadoNuevo: 'En revisión', versionEstadoEsperada: 0 });
  expect(visible(tree)).toContain('Pendiente');
  await act(async () => { finish({ cambiado: true, estado: 'En revisión', versionEstado: 1 }); });
  expect(visible(tree)).toContain('En revisión');
  expect(visible(tree)).not.toContain('Pendiente');
});

test('un reporte resuelto carece de acción para cambiar su estado', async () => {
  listarReportesAdmin.mockResolvedValueOnce(page([{ ...original, estado: 'Resuelto', versionEstado: 3 }]));
  await mount();
  expect(visible(tree)).toContain('Resuelto');
  expect(button(tree, 'Cambiar estado de Luminaria apagada')).toBeUndefined();
});

test('un conflicto conserva lo visible y permite recargar el estado real', async () => {
  cambiarEstadoReporte.mockRejectedValueOnce(Object.assign(new Error('El reporte cambió.'), { status: 409 }));
  await mount();
  await press(tree, 'Cambiar estado de Luminaria apagada');
  await press(tree, 'En revisión');
  await press(tree, 'Confirmar cambio de estado');
  expect(visible(tree)).toMatch(/conflicto|el reporte cambió/i);
  expect(visible(tree)).toContain('Pendiente');
  listarReportesAdmin.mockResolvedValueOnce(page([{ ...original, estado: 'Asignado', versionEstado: 2 }]));
  await press(tree, 'Recargar reportes');
  expect(visible(tree)).toContain('Asignado');
});

test('un fallo del servidor deja el estado anterior en pantalla', async () => {
  cambiarEstadoReporte.mockRejectedValueOnce(new Error('No se pudo actualizar el estado.'));
  await mount();
  await press(tree, 'Cambiar estado de Luminaria apagada');
  await press(tree, 'En revisión');
  await press(tree, 'Confirmar cambio de estado');
  expect(visible(tree)).toMatch(/no se pudo actualizar/i);
  expect(visible(tree)).toContain('Pendiente');
});

test.each([
  ['carga', () => new Promise(() => {}), /cargando reportes/i],
  ['vacío', async () => page([]), /no hay reportes/i],
  ['error', async () => { throw new Error('Sin red'); }, /no se pudieron cargar los reportes/i],
])('distingue el estado de %s', async (_, load, expected) => {
  listarReportesAdmin.mockImplementationOnce(load);
  await mount();
  expect(visible(tree)).toMatch(expected);
});
