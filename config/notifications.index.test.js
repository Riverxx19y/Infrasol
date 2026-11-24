import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { indexes } = JSON.parse(readFileSync(join(__dirname, '..', 'firestore.indexes.json'), 'utf8'));
const hasIndex = (fields) => indexes.some((index) => index.collectionGroup === 'notificaciones'
  && index.queryScope === 'COLLECTION'
  && JSON.stringify(index.fields.map(({ fieldPath, order }) => [fieldPath, order])) === JSON.stringify(fields));

test('HU-06 declara índice para listar avisos propios por fecha descendente', () => {
  expect(hasIndex([['usuarioId', 'ASCENDING'], ['fecha', 'DESCENDING']])).toBe(true);
});

test('HU-06 declara índice para escuchar cambios de estado propios por fecha', () => {
  expect(hasIndex([['usuarioId', 'ASCENDING'], ['tipo', 'ASCENDING'], ['fecha', 'DESCENDING']])).toBe(true);
});
