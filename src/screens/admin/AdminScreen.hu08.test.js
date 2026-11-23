import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import AdminScreen from './AdminScreen';
import { cambiarEstadoReporte, listarReportesAdmin, obtenerEstadisticasAdmin } from '../../services/adminReports.gateway';

jest.mock('../../services/adminReports.gateway', () => ({
  cambiarEstadoReporte: jest.fn(), listarReportesAdmin: jest.fn(), obtenerEstadisticasAdmin: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const estadosVacios = { Pendiente: 0, 'En revisión': 0, Asignado: 0, Resuelto: 0 };
const porTipo = { Alumbrado: 1, Vías: 2, Alcantarillado: 3, Basuras: 4, 'Zonas verdes': 5, Otro: 12, 'Sin clasificar': 0 };
const pagina = { id: 'r1', descripcion: 'Luminaria de la lista', tipo: 'Alumbrado', estado: 'Asignado', versionEstado: 2 };
const topApoyados = [
  { id: 'r30', descripcion: 'Bache destacado', tipo: 'Vías', estado: 'Pendiente', apoyos: 9 },
  { id: 'r29', descripcion: 'Parque destacado', tipo: 'Zonas verdes', estado: 'Asignado', apoyos: 5 },
  { id: 'r28', descripcion: 'Desagüe destacado', tipo: 'Alcantarillado', estado: 'Resuelto', apoyos: 1 },
];
const resumen = { total: 27, porEstado: { Pendiente: 21, 'En revisión': 1, Asignado: 3, Resuelto: 2 },
  tasaResolucion: 7.41, porTipo, topApoyados };

let tree;
const visible = () => tree.root.findAllByType(Text)
  .map(({ props }) => React.Children.toArray(props.children).join('')).join('\n');
const button = (label) => tree.root.findAllByType(TouchableOpacity)
  .find(({ props }) => props.accessibilityLabel === label);

async function mount() {
  await act(async () => { tree = create(<AdminScreen onSignOut={() => {}} />); });
}
async function press(label) {
  expect(button(label)).toBeDefined();
  await act(async () => { await button(label).props.onPress(); });
}

beforeEach(() => {
  jest.resetAllMocks();
  listarReportesAdmin.mockResolvedValue({ reportes: [pagina], cursor: 'next' });
  obtenerEstadisticasAdmin.mockResolvedValue(resumen);
});
afterEach(() => {
  if (tree) act(() => { tree.unmount(); tree = undefined; });
});

test('muestra el total global, los cuatro estados y la tasa', async () => {
  await mount();
  expect(visible()).toMatch(/total(?: de reportes)?[:\s]+27/i);
  for (const [estado, cantidad] of Object.entries(resumen.porEstado)) {
    expect(visible()).toMatch(new RegExp(estado + '[:\\s]+' + cantidad));
  }
  expect(visible()).toMatch(/7[.,]41\s*%/);
});

test('muestra los tres destacados del servidor en orden y con su número de apoyos', async () => {
  await mount();
  const text = visible();
  let offset = -1;
  for (const [index, item] of topApoyados.entries()) {
    const position = text.indexOf(item.descripcion);
    expect(position).toBeGreaterThan(offset);
    const nextItem = topApoyados[index + 1];
    const end = nextItem ? text.indexOf(nextItem.descripcion) : text.length;
    expect(text.slice(position, end)).toMatch(new RegExp('\\b' + item.apoyos + '\\s+apoyo'));
    offset = position;
  }
});

test('muestra el desglose con los seis nombres y cantidades del catálogo', async () => {
  await mount();
  for (const [tipo, cantidad] of Object.entries(porTipo).slice(0, 6)) {
    expect(visible()).toMatch(new RegExp(tipo + '[:\\s]+' + cantidad));
  }
});

test('indica carga del resumen mientras la lista sigue disponible', async () => {
  obtenerEstadisticasAdmin.mockReturnValueOnce(new Promise(() => {}));
  await mount();
  expect(visible()).toContain(pagina.descripcion);
  expect(visible()).toMatch(/cargando (?:el resumen|estadísticas)/i);
});

test('muestra cero y un aviso cuando no existen datos para el resumen', async () => {
  listarReportesAdmin.mockResolvedValueOnce({ reportes: [], cursor: null });
  obtenerEstadisticasAdmin.mockResolvedValueOnce({
    total: 0, porEstado: estadosVacios, tasaResolucion: 0, topApoyados: [],
    porTipo: Object.fromEntries(Object.keys(porTipo).map((tipo) => [tipo, 0])),
  });
  await mount();
  expect(visible()).toMatch(/total(?: de reportes)?[:\s]+0/i);
  expect(visible()).toMatch(/\b0(?:[.,]00)?\s*%/);
  expect(visible()).toMatch(/no hay reportes/i);
});

test('permite reintentar el resumen después de un error sin recargar la lista', async () => {
  obtenerEstadisticasAdmin.mockRejectedValueOnce(new Error('Sin conexión'));
  await mount();
  expect(visible()).toMatch(/no se pudieron cargar las estadísticas/i);
  await press('Reintentar estadísticas');
  expect(obtenerEstadisticasAdmin).toHaveBeenCalledTimes(2);
  expect(listarReportesAdmin).toHaveBeenCalledTimes(1);
  expect(visible()).toMatch(/total(?: de reportes)?[:\s]+27/i);
  expect(visible()).not.toMatch(/no se pudieron cargar las estadísticas/i);
});

test('actualiza el resumen solo después de confirmar el cambio de estado', async () => {
  obtenerEstadisticasAdmin.mockResolvedValueOnce(resumen).mockResolvedValueOnce({
    ...resumen, porEstado: { ...resumen.porEstado, Asignado: 2, Resuelto: 3 }, tasaResolucion: 11.11,
  });
  let finish;
  cambiarEstadoReporte.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await mount();
  await press('Cambiar estado de ' + pagina.descripcion);
  await press('Resuelto');
  expect(cambiarEstadoReporte).not.toHaveBeenCalled();
  await act(async () => { button('Confirmar cambio de estado').props.onPress(); });
  expect(cambiarEstadoReporte).toHaveBeenCalledWith('r1', { estadoNuevo: 'Resuelto', versionEstadoEsperada: 2 });
  const consultasAntesDeConfirmar = obtenerEstadisticasAdmin.mock.calls.length;
  await act(async () => { finish({ cambiado: true, estado: 'Resuelto', versionEstado: 3 }); });
  expect(consultasAntesDeConfirmar).toBe(1);
  expect(obtenerEstadisticasAdmin).toHaveBeenCalledTimes(2);
  expect(visible()).toMatch(/11[.,]11\s*%/);
});

test('dos pulsaciones de reintento mientras se consulta el resumen hacen una sola petición', async () => {
  let terminar;
  obtenerEstadisticasAdmin.mockRejectedValueOnce(new Error('Sin conexión'))
    .mockImplementationOnce(() => new Promise((resolve) => { terminar = resolve; }));
  await mount();
  const reintentar = button('Reintentar estadísticas').props.onPress;
  await act(async () => { reintentar(); reintentar(); });
  expect(obtenerEstadisticasAdmin).toHaveBeenCalledTimes(2);
  await act(async () => { terminar(resumen); });
  expect(visible()).toMatch(/total(?: de reportes)?[:\s]+27/i);
});

test('cargar otra página conserva las filas y el resumen global', async () => {
  listarReportesAdmin.mockResolvedValueOnce({ reportes: [pagina], cursor: 'next' })
    .mockResolvedValueOnce({ reportes: [{ ...pagina, id: 'r2', descripcion: 'Segunda página' }], cursor: null });
  await mount();
  await press('Cargar más reportes');
  expect(listarReportesAdmin).toHaveBeenLastCalledWith({ cursor: 'next' });
  expect(visible()).toContain(pagina.descripcion);
  expect(visible()).toContain('Segunda página');
  expect(visible()).toMatch(/total(?: de reportes)?[:\s]+27/i);
});

test('un 409 conserva el flujo de recarga y el resumen confirmado', async () => {
  cambiarEstadoReporte.mockRejectedValueOnce(Object.assign(new Error('Versión obsoleta'), { status: 409 }));
  await mount();
  await press('Cambiar estado de ' + pagina.descripcion);
  await press('Resuelto');
  await press('Confirmar cambio de estado');
  expect(visible()).toMatch(/conflicto de estado/i);
  expect(visible()).toMatch(/Estado: Asignado/);
  expect(button('Recargar reportes')).toBeDefined();
  expect(visible()).toMatch(/7[.,]41\s*%/);
});
