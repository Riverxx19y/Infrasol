const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, Timestamp, updateDoc, getDoc, deleteDoc } = require('firebase/firestore');

let environment;
const owner = 'citizen-1';
const payload = {
  tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
  lugar: '', usuarioId: owner, estado: 'Pendiente', fotoUrl: null, fecha: Timestamp.now(),
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu01',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'usuarios', owner), {
      uid: owner, rol: 'ciudadano', emailVerificado: true,
    });
  });
});
after(async () => environment?.cleanup());

function client(uid = owner) {
  return environment.authenticatedContext(uid).firestore();
}

test('ciudadano verificado crea un reporte sin fotografía', async () => {
  await assertSucceeds(setDoc(doc(client(), 'reportes', 'r1'), payload));
  const { fotoUrl, ...sinCampoDeFoto } = payload;
  await assertSucceeds(setDoc(doc(client(), 'reportes', 'r2'), sinCampoDeFoto));
});

test('el usuario sin sesión no puede crear', async () => {
  await assertFails(setDoc(doc(environment.unauthenticatedContext().firestore(), 'reportes', 'r1'), payload));
});

test('el ciudadano no verificado no puede crear', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'usuarios', owner), { emailVerificado: false });
  });
  await assertFails(setDoc(doc(client(), 'reportes', 'r1'), payload));
});

test('un rol desconocido no puede crear', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'usuarios', owner), { rol: 'desconocido' });
  });
  await assertFails(setDoc(doc(client(), 'reportes', 'r1'), payload));
});

test('no puede crear un reporte a nombre de otro ciudadano', async () => {
  await assertFails(setDoc(doc(client(), 'reportes', 'r1'), { ...payload, usuarioId: 'other' }));
});

test('no puede fijar un estado inicial distinto de Pendiente', async () => {
  await assertFails(setDoc(doc(client(), 'reportes', 'r1'), { ...payload, estado: 'Resuelto' }));
});

test('rechaza campos faltantes, coordenadas fuera de rango y privilegios añadidos', async () => {
  const reference = doc(client(), 'reportes', 'r1');
  await assertFails(setDoc(reference, { ...payload, descripcion: '' }));
  await assertFails(setDoc(reference, { ...payload, lat: 91 }));
  await assertFails(setDoc(reference, { ...payload, rol: 'administrador' }));
});

test('no concede lectura, actualización ni eliminación general', async () => {
  const reference = doc(client(), 'reportes', 'r1');
  await assertSucceeds(setDoc(reference, payload));
  await assertFails(getDoc(reference));
  await assertFails(updateDoc(reference, { estado: 'Resuelto' }));
  await assertFails(deleteDoc(reference));
});
