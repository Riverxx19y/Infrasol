const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { deleteDoc, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

let environment;
const profile = {
  uid: 'citizen-1', nombre: 'Ana Pérez', email: 'citizen@example.test',
  rol: 'ciudadano', emailVerificado: false,
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-infrasol-hu01',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

test('el ciudadano puede crear y leer solamente su perfil no verificado', async () => {
  const client = environment.authenticatedContext(profile.uid, { email: profile.email }).firestore();
  await assertSucceeds(setDoc(doc(client, 'usuarios', profile.uid), profile));
  await assertSucceeds(getDoc(doc(client, 'usuarios', profile.uid)));
  await assertFails(getDoc(doc(client, 'usuarios', 'other')));
});

test('el cliente no puede crear un perfil verificado ni cambiar emailVerificado', async () => {
  const client = environment.authenticatedContext(profile.uid, { email: profile.email }).firestore();
  await assertFails(setDoc(doc(client, 'usuarios', profile.uid), { ...profile, emailVerificado: true }));
  await assertSucceeds(setDoc(doc(client, 'usuarios', profile.uid), profile));
  await assertFails(updateDoc(doc(client, 'usuarios', profile.uid), { emailVerificado: true }));
});

test('el cliente no puede crear un perfil con otro UID o rol', async () => {
  const client = environment.authenticatedContext(profile.uid, { email: profile.email }).firestore();
  const reference = doc(client, 'usuarios', profile.uid);
  await assertFails(setDoc(reference, { ...profile, uid: 'other' }));
  await assertFails(setDoc(reference, { ...profile, rol: 'administrador' }));
});

test('el cliente no puede cambiar su UID o rol ni eliminar el perfil', async () => {
  const client = environment.authenticatedContext(profile.uid, { email: profile.email }).firestore();
  const reference = doc(client, 'usuarios', profile.uid);
  await assertSucceeds(setDoc(reference, profile));
  await assertFails(updateDoc(reference, { uid: 'other' }));
  await assertFails(updateDoc(reference, { rol: 'administrador' }));
  await assertFails(deleteDoc(reference));
});

test('ningún cliente puede leer ni escribir retos OTP o límites del proveedor', async () => {
  const client = environment.authenticatedContext(profile.uid, { email: profile.email }).firestore();
  for (const path of [`verificaciones/${profile.uid}`, `otpVerificaciones/${profile.uid}`, 'otpRateLimits/emailjs']) {
    await assertFails(getDoc(doc(client, path)));
    await assertFails(setDoc(doc(client, path), { codigo: '123456' }));
  }
});
