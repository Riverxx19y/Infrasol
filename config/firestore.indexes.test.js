import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { indexes } = JSON.parse(readFileSync(join(__dirname, '..', 'firestore.indexes.json'), 'utf8'));

const fieldsOf = (index) => index.fields.map(({ fieldPath, order }) => [fieldPath, order]);
const findIndex = (expected) => indexes.find((index) => index.collectionGroup === 'reportes'
  && index.queryScope === 'COLLECTION'
  && JSON.stringify(fieldsOf(index)) === JSON.stringify(expected));

test('conserva el índice de HU-04: estado ASC + fecha DESC', () => {
  expect(findIndex([['estado', 'ASCENDING'], ['fecha', 'DESCENDING']])).toBeDefined();
});

test('declara el índice de HU-07: usuarioId ASC + fecha DESC', () => {
  expect(findIndex([['usuarioId', 'ASCENDING'], ['fecha', 'DESCENDING']])).toBeDefined();
});
