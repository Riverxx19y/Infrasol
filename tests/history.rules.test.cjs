const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, where,
} = require('firebase/firestore');

let environment;
const owner = 'citizen-1';
const other = 'citizen-2';
const payload = (usuarioId, estado, seconds) => ({
  tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
  lugar: '', usuarioId, estado, fotoUrl: null, fecha: Timestamp.fromMillis(seconds * 1000),
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu07',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'usuarios', owner), { uid: owner, rol: 'ciudadano', emailVerificado: true });
    await setDoc(doc(db, 'usuarios', other), { uid: other, rol: 'ciudadano', emailVerificado: true });
    await setDoc(doc(db, 'reportes', 'own-pending'), payload(owner, 'Pendiente', 2000));
    await setDoc(doc(db, 'reportes', 'own-resolved'), payload(owner, 'Resuelto', 1000));
    await setDoc(doc(db, 'reportes', 'other-pending'), payload(other, 'Pendiente', 3000));
    await setDoc(doc(db, 'reportes', 'other-resolved'), payload(other, 'Resuelto', 4000));
  });
});
after(async () => environment?.cleanup());

const client = (uid = owner) => environment.authenticatedContext(uid).firestore();
const historyQuery = (db, uid = owner, max = 25) => query(
  collection(db, 'reportes'), where('usuarioId', '==', uid), orderBy('fecha', 'desc'), limit(max),
);
const setProfile = (profile) => environment.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'usuarios', owner), { uid: owner, ...profile });
});

test('el ciudadano verificado lista solo sus reportes Pendiente y Resuelto filtrando por usuarioId', async () => {
  const result = await assertSucceeds(getDocs(historyQuery(client())));
  const ids = result.docs.map((d) => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(['own-pending', 'own-resolved'])) {
    throw new Error(`Se esperaban solo los reportes propios ordenados por fecha; se obtuvo ${ids}`);
  }
});

test('el ciudadano verificado puede filtrar su historial por estado Resuelto', async () => {
  const q = query(collection(client(), 'reportes'),
    where('usuarioId', '==', owner), where('estado', '==', 'Resuelto'), limit(25));
  const result = await assertSucceeds(getDocs(q));
  if (result.docs.length !== 1 || result.docs[0].id !== 'own-resolved') {
    throw new Error('Debe devolver solo el reporte resuelto propio');
  }
});

test('no puede consultar el historial de otro UID', async () => {
  await assertFails(getDocs(historyQuery(client(), other)));
});

test('no puede ejecutar consultas generales sin filtro suficiente', async () => {
  await assertFails(getDocs(query(collection(client(), 'reportes'), limit(25))));
  await assertFails(getDocs(query(collection(client(), 'reportes'), orderBy('fecha', 'desc'), limit(25))));
});

test('exige un límite de consulta de máximo 25', async () => {
  const base = collection(client(), 'reportes');
  await assertFails(getDocs(query(base, where('usuarioId', '==', owner))));
  await assertFails(getDocs(query(base, where('usuarioId', '==', owner), limit(26))));
  await assertSucceeds(getDocs(query(base, where('usuarioId', '==', owner), limit(25))));
});

test('usuario sin sesión no puede listar reportes privados', async () => {
  await assertFails(getDocs(historyQuery(environment.unauthenticatedContext().firestore())));
});

for (const [label, profile] of [
  ['ciudadano sin verificar', { rol: 'ciudadano', emailVerificado: false }],
  ['administrador', { rol: 'administrador', emailVerificado: true }],
  ['rol desconocido', { rol: 'desconocido', emailVerificado: true }],
]) {
  test(`${label} no puede listar su historial`, async () => {
    await setProfile(profile);
    await assertFails(getDocs(historyQuery(client())));
  });
}

test('getDoc individual sigue restringido, incluso para el dueño', async () => {
  await assertFails(getDoc(doc(client(), 'reportes', 'own-pending')));
  await assertFails(getDoc(doc(client(), 'reportes', 'own-resolved')));
  await assertFails(getDoc(doc(client(), 'reportes', 'other-pending')));
});

test('regresión HU-04: la consulta de reportes Pendiente con límite sigue permitida', async () => {
  const q = query(collection(client(), 'reportes'), where('estado', '==', 'Pendiente'), limit(25));
  const result = await assertSucceeds(getDocs(q));
  const ids = result.docs.map((d) => d.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(['other-pending', 'own-pending'])) {
    throw new Error(`HU-04 debe devolver solo reportes Pendiente; se obtuvo ${ids}`);
  }
});

test('regresión HU-04: consultar Resuelto sin filtro de UID sigue denegado', async () => {
  const q = query(collection(client(), 'reportes'), where('estado', '==', 'Resuelto'), limit(25));
  await assertFails(getDocs(q));
});
