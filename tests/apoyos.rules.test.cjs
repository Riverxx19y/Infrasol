const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, doc, getDocs, limit, query, setDoc, Timestamp, updateDoc, where } = require('firebase/firestore');

let environment;
const uid = 'ciudadano-1';
const author = 'autor-1';

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu05',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const id of [uid, author]) {
      await setDoc(doc(db, 'usuarios', id), { uid: id, rol: 'ciudadano', emailVerificado: true });
    }
    await setDoc(doc(db, 'reportes', 'r1'), {
      tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 0, lng: 0,
      lugar: '', usuarioId: author, estado: 'Pendiente', fecha: Timestamp.now(),
      apoyos: 0, apoyadores: [],
    });
  });
});
after(async () => environment?.cleanup());

const client = () => environment.authenticatedContext(uid).firestore();

test('el cliente no puede cambiar directamente apoyos ni apoyadores', async () => {
  const reference = doc(client(), 'reportes', 'r1');
  await assertFails(updateDoc(reference, { apoyos: 1 }));
  await assertFails(updateDoc(reference, { apoyadores: [uid] }));
});

test('el cliente no puede concederse puntos ni alterar puntos del autor', async () => {
  await assertFails(updateDoc(doc(client(), 'usuarios', uid), { puntos: 100 }));
  await assertFails(updateDoc(doc(client(), 'usuarios', author), { puntos: 100 }));
});

test('el cliente no puede crear un aviso de apoyo falsificado', async () => {
  await assertFails(setDoc(doc(client(), 'notificaciones', 'r1_intruso'), {
    reporteId: 'r1', usuarioId: author, apoyadorId: uid, mensaje: 'Apoyo recibido',
  }));
});

test('la consulta de Pendiente y categoría exacta sigue permitida con límite 25', async () => {
  const result = await assertSucceeds(getDocs(query(collection(client(), 'reportes'),
    where('estado', '==', 'Pendiente'), where('tipo', '==', 'Alumbrado'), limit(25))));
  if (result.docs.length !== 1 || result.docs[0].id !== 'r1') {
    throw new Error('La consulta filtrada no devolvió el reporte activo de esa categoría.');
  }
});
