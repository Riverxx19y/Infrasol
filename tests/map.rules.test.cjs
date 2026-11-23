const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, doc, getDocs, limit, query, setDoc, Timestamp, where } = require('firebase/firestore');

let environment;
const owner = 'citizen-1';
const payload = {
  tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
  lugar: '', usuarioId: owner, estado: 'Pendiente', fotoUrl: null, fecha: Timestamp.now(),
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu04',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'usuarios', owner), {
      uid: owner, rol: 'ciudadano', emailVerificado: true,
    });
    await setDoc(doc(context.firestore(), 'reportes', 'active'), payload);
    await setDoc(doc(context.firestore(), 'reportes', 'resolved'), { ...payload, estado: 'Resuelto' });
  });
});
after(async () => environment?.cleanup());

const client = (uid = owner) => environment.authenticatedContext(uid).firestore();
const activeQuery = (db) => query(collection(db, 'reportes'), where('estado', '==', 'Pendiente'), limit(25));

test('ciudadano verificado puede listar Pendiente sin recibir Resuelto', async () => {
  const result = await assertSucceeds(getDocs(activeQuery(client())));
  if (result.docs.length !== 1 || result.docs[0].id !== 'active') {
    throw new Error('La consulta debe devolver solo el reporte activo');
  }
});

test('consulta general sin filtro de estado sigue prohibida', async () => {
  await assertFails(getDocs(query(collection(client(), 'reportes'), limit(25))));
});

test('consultar explícitamente Resuelto sigue prohibido', async () => {
  const q = query(collection(client(), 'reportes'), where('estado', '==', 'Resuelto'), limit(25));
  await assertFails(getDocs(q));
});

test('usuario sin sesión no puede listar reportes activos', async () => {
  await assertFails(getDocs(activeQuery(environment.unauthenticatedContext().firestore())));
});

test('ciudadano sin verificación no puede listar reportes activos', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'usuarios', owner), {
      uid: owner, rol: 'ciudadano', emailVerificado: false,
    });
  });
  await assertFails(getDocs(activeQuery(client())));
});

test('rol no autorizado no puede listar reportes activos', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'usuarios', owner), {
      uid: owner, rol: 'administrador', emailVerificado: true,
    });
  });
  await assertFails(getDocs(activeQuery(client())));
});
