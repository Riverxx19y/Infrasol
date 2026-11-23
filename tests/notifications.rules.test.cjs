const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, updateDoc, where } = require('firebase/firestore');

let environment;
const stateNotice = { tipo: 'cambio_estado', usuarioId: 'owner', reporteId: 'r1',
  estadoAnterior: 'Pendiente', estadoNuevo: 'En revisión', fecha: Timestamp.now(), leida: false };
const supportNotice = { tipo: 'apoyo', usuarioId: 'owner', reporteId: 'r2',
  apoyadorId: 'supporter', fecha: Timestamp.now() }; // Contrato HU-05: sin leida.

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Estas pruebas requieren Firestore Emulator.');
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu06',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [id, rol, emailVerificado] of [
      ['owner', 'ciudadano', true], ['other', 'ciudadano', true],
      ['unverified', 'ciudadano', false], ['admin', 'administrador', true],
    ]) await setDoc(doc(db, 'usuarios', id), { uid: id, rol, emailVerificado });
    await setDoc(doc(db, 'notificaciones', 'state'), stateNotice);
    await setDoc(doc(db, 'notificaciones', 'support'), supportNotice);
    await setDoc(doc(db, 'notificaciones', 'read'), { ...stateNotice, reporteId: 'r3', leida: true });
    await setDoc(doc(db, 'notificaciones', 'foreign'), { ...stateNotice, usuarioId: 'other' });
  });
});
after(async () => environment?.cleanup());
const client = (uid) => environment.authenticatedContext(uid).firestore();
const reference = (db, id) => doc(db, 'notificaciones', id);
const ownQuery = (db, uid) => query(collection(db, 'notificaciones'),
  where('usuarioId', '==', uid), orderBy('fecha', 'desc'), limit(25));

test('ciudadano verificado puede leer un aviso de cambio de estado propio', async () => {
  const snapshot = await assertSucceeds(getDoc(reference(client('owner'), 'state')));
  assert.equal(snapshot.data().estadoNuevo, 'En revisión');
});

test('consulta filtrada por UID devuelve cambios de estado y apoyos propios, no ajenos', async () => {
  const result = await assertSucceeds(getDocs(ownQuery(client('owner'), 'owner')));
  assert.deepEqual(new Set(result.docs.map((item) => item.id)), new Set(['state', 'support', 'read']));
});

test('consulta para el badge puede filtrar tipo cambio_estado del dueño', async () => {
  const db = client('owner');
  const result = await assertSucceeds(getDocs(query(collection(db, 'notificaciones'),
    where('usuarioId', '==', 'owner'), where('tipo', '==', 'cambio_estado'), orderBy('fecha', 'desc'), limit(25))));
  assert.deepEqual(new Set(result.docs.map((item) => item.id)), new Set(['state', 'read']));
});

test('otro ciudadano no lee un aviso ajeno ni una consulta dirigida al UID ajeno', async () => {
  const db = client('other');
  await assertFails(getDoc(reference(db, 'state')));
  await assertFails(getDocs(ownQuery(db, 'owner')));
});

test('una consulta general sin filtro de destinatario no obtiene avisos', async () => {
  const db = client('owner');
  await assertFails(getDocs(query(collection(db, 'notificaciones'), orderBy('fecha', 'desc'), limit(25))));
});

test('sin sesión no puede leer ni listar avisos', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(reference(db, 'state')));
  await assertFails(getDocs(ownQuery(db, 'owner')));
});

for (const uid of ['unverified', 'admin']) {
  test(`${uid} no usa permisos ciudadanos de notificaciones`, async () => {
    const db = client(uid);
    await assertFails(getDoc(reference(db, 'state')));
    await assertFails(getDocs(ownQuery(db, uid)));
  });
}

test('propietario marca leida: true sin cambiar otro campo', async () => {
  const db = client('owner');
  await assertSucceeds(updateDoc(reference(db, 'state'), { leida: true }));
  const snapshot = await environment.withSecurityRulesDisabled((context) =>
    getDoc(reference(context.firestore(), 'state')));
  assert.deepEqual(snapshot.data(), { ...stateNotice, leida: true });
});

test('documento histórico sin leida puede marcarse como leído', async () => {
  const db = client('owner');
  await assertSucceeds(updateDoc(reference(db, 'support'), { leida: true }));
  const snapshot = await environment.withSecurityRulesDisabled((context) =>
    getDoc(reference(context.firestore(), 'support')));
  assert.deepEqual(snapshot.data(), { ...supportNotice, leida: true });
});

test('no marca un aviso ajeno ni cambia leida de true a false', async () => {
  const db = client('owner');
  await assertFails(updateDoc(reference(db, 'foreign'), { leida: true }));
  await assertFails(updateDoc(reference(db, 'read'), { leida: false }));
});

test('no altera destinatario, reporte, tipo, estados, fecha ni apoyador', async () => {
  const db = client('owner');
  for (const change of [
    { usuarioId: 'other' }, { reporteId: 'fake' }, { tipo: 'apoyo' },
    { estadoAnterior: 'Resuelto' }, { estadoNuevo: 'Resuelto' },
    { fecha: Timestamp.now() }, { apoyadorId: 'fake' },
  ]) await assertFails(updateDoc(reference(db, change.apoyadorId ? 'support' : 'state'), { ...change, leida: true }));
});

test('ningún ciudadano crea ni elimina avisos arbitrarios', async () => {
  const db = client('owner');
  await assertFails(setDoc(reference(db, 'forged'), stateNotice));
  await assertFails(deleteDoc(reference(db, 'state')));
});
