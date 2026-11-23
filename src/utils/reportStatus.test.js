import { existsSync } from 'node:fs';
import { join } from 'node:path';

// La ausencia del archivo es el fallo RED esperado; otros errores de importación siguen visibles.
const implementation = existsSync(join(__dirname, 'reportStatus.js')) ? require('./reportStatus') : {};
const estiloEstado = implementation.estiloEstado;

const PENDIENTE = { fondo: '#FFF4D6', texto: '#B07D00' };
const RESUELTO = { fondo: '#D6FFF0', texto: '#008A5A' };
const NEUTRAL = { fondo: '#F1F5F9', texto: '#64748B' };

test('Pendiente usa fondo #FFF4D6 y texto #B07D00', () => {
  expect(estiloEstado).toEqual(expect.any(Function));
  expect(estiloEstado('Pendiente')).toEqual({ etiqueta: 'Pendiente', ...PENDIENTE });
});

test('Resuelto usa fondo #D6FFF0 y texto #008A5A', () => {
  expect(estiloEstado).toEqual(expect.any(Function));
  expect(estiloEstado('Resuelto')).toEqual({ etiqueta: 'Resuelto', ...RESUELTO });
});

test.each(['En revisión', 'Asignado', 'pendiente', 'Cerrado'])(
  'un estado desconocido (%p) usa el estilo neutral y conserva su etiqueta real',
  (estado) => {
    expect(estiloEstado).toEqual(expect.any(Function));
    expect(estiloEstado(estado)).toEqual({ etiqueta: estado, ...NEUTRAL });
  },
);

test.each([undefined, null, '', '   '])('un estado ausente (%p) usa el estilo neutral', (estado) => {
  expect(estiloEstado).toEqual(expect.any(Function));
  expect(estiloEstado(estado)).toEqual({ etiqueta: 'Sin estado', ...NEUTRAL });
});

test.each(['En revisión', undefined, 42])('el estado %p no se presenta falsamente como Pendiente', (estado) => {
  expect(estiloEstado).toEqual(expect.any(Function));
  const estilo = estiloEstado(estado);
  expect(estilo.etiqueta).not.toBe('Pendiente');
  expect(estilo.fondo).not.toBe(PENDIENTE.fondo);
  expect(estilo.texto).not.toBe(PENDIENTE.texto);
});
