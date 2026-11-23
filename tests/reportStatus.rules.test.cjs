const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, doc, getDocs, limit, orderBy, query, setDoc, Timestamp, updateDoc, where } = require('firebase/firestore');

let env;
const current = {
  usuarioId: 'owner', tipo: 'Alumbrado', descripcion: 'Luminaria apagada',
  lat: 0, lng: 0, estado: 'Pendiente', fecha: Timestamp.now(),
};
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Ejecuta esta suite solo con Firestore Emulator.');
  env = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu09-rules',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'usuarios', 'owner'), { rol: 'ciudadano', emailVerificado: true }),
      setDoc(doc(db, 'usuarios', 'admin'), { rol: 'administrador', emailVerificado: true }),
      setDoc(doc(db, 'reportes', 'r1'), current),
      setDoc(doc(db, 'reportes', 'r2'), { ...current, estado: 'En revisión' }),
    ]);
  });
});
after(async () => env?.cleanup());
const client = (uid) => env.authenticatedContext(uid).firestore();

for (const [role, uid] of [['ciudadano propietario', 'owner'], ['administrador verificado', 'admin']]) {
  test(role + ' no puede cambiar estado ni versión con el SDK cliente', async () => {
    await assertFails(updateDoc(doc(client(uid), 'reportes', 'r1'), { estado: 'En revisión', versionEstado: 1 }));
  });
}

test('ningún rol puede crear arbitrariamente un aviso de cambio de estado', async () => {
  for (const db of [client('owner'), client('admin'), env.unauthenticatedContext().firestore()]) {
    await assertFails(setDoc(doc(db, 'notificaciones', 'estado_r1_1'), {
      tipo: 'cambio_estado', usuarioId: 'owner', reporteId: 'r1',
      estadoAnterior: 'Pendiente', estadoNuevo: 'En revisión', fecha: Timestamp.now(), leida: false,
    }));
  }
});

test('sigue denegada la alteración de apoyos, puntos y propietario', async () => {
  for (const uid of ['owner', 'admin']) {
    const db = client(uid);
    await assertFails(updateDoc(doc(db, 'reportes', 'r1'), { apoyos: 1, apoyadores: [uid] }));
    await assertFails(updateDoc(doc(db, 'usuarios', uid), { puntos: 100 }));
    await assertFails(updateDoc(doc(db, 'reportes', 'r1'), { usuarioId: uid + '-otro' }));
  }
});

test('HU-03 permite crear un reporte propio en Pendiente', async () => {
  await assertSucceeds(setDoc(doc(client('owner'), 'reportes', 'nuevo'), current));
});

test('HU-04 y HU-05 consultan solo Pendiente y HU-07 conserva el historial en todos los estados', async () => {
  const reports = collection(client('owner'), 'reportes');
  const pending = where('estado', '==', 'Pendiente');
  const active = await assertSucceeds(getDocs(query(reports, pending, orderBy('fecha', 'desc'), limit(25))));
  const near = await assertSucceeds(getDocs(query(reports, pending, where('tipo', '==', 'Alumbrado'), orderBy('fecha', 'desc'), limit(25))));
  const history = await assertSucceeds(getDocs(query(reports, where('usuarioId', '==', 'owner'), orderBy('fecha', 'desc'), limit(25))));
  for (const result of [active, near]) {
    assert.ok(result.docs.some((snapshot) => snapshot.id === 'r1'));
    assert.ok(!result.docs.some((snapshot) => snapshot.id === 'r2'));
  }
  assert.ok(history.docs.some((snapshot) => snapshot.id === 'r2'));
});
