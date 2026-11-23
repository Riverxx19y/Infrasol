import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('existe índice compuesto para estado, tipo y fecha de la búsqueda paginada', () => {
  const { indexes } = JSON.parse(readFileSync(join(__dirname, '..', 'firestore.indexes.json'), 'utf8'));
  expect(indexes).toEqual(expect.arrayContaining([
    expect.objectContaining({
      collectionGroup: 'reportes',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'estado', order: 'ASCENDING' },
        { fieldPath: 'tipo', order: 'ASCENDING' },
        { fieldPath: 'fecha', order: 'DESCENDING' },
      ],
    }),
  ]));
});
