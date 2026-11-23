import { formatearTasaResolucion } from './reportFormat';

test.each([
  [0, '0,00 %'],
  [3.7, '3,70 %'],
  [7.416, '7,42 %'],
  [100, '100,00 %'],
])('formatea la tasa %s como %s', (tasa, esperado) => {
  expect(formatearTasaResolucion(tasa)).toBe(esperado);
});
