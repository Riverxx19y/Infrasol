import React from 'react';
import { act, create } from 'react-test-renderer';
import RootNavigator from './RootNavigator';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((database, collection, id) => ({ collection, id })),
  onSnapshot: jest.fn(),
}));
jest.mock('../screens/auth/RegisterScreen', () => 'RegisterScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/StartScreen', () => 'StartScreen');

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => jest.clearAllMocks());

test('navega entre registro, verificación y pantalla inicial según el perfil', () => {
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
  let tree;
  act(() => { tree = create(<RootNavigator />); });

  const authChanged = onAuthStateChanged.mock.calls[0][1];
  act(() => { authChanged(null); });
  expect(tree.root.findAllByType('RegisterScreen')).toHaveLength(1);
  expect(tree.root.findByType('RegisterScreen').props.otpGateway.solicitarCodigo).toEqual(expect.any(Function));

  act(() => { authChanged({ uid: 'u1', email: 'persona@example.test' }); });
  const profileChanged = onSnapshot.mock.calls[0][1];
  act(() => { profileChanged({ exists: () => true, data: () => ({ emailVerificado: false }) }); });
  expect(tree.root.findAllByType('VerificationScreen')).toHaveLength(1);
  expect(tree.root.findByType('VerificationScreen').props.otpGateway.verificarCodigo).toEqual(expect.any(Function));
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);

  act(() => { profileChanged({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: true }) }); });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(1);
});

test('ignora respuestas tardías del perfil anterior al cambiar de sesión', () => {
  onAuthStateChanged.mockReturnValue(() => {});
  const stopFirstProfile = jest.fn();
  onSnapshot.mockReturnValueOnce(stopFirstProfile).mockReturnValueOnce(() => {});
  let tree;
  act(() => { tree = create(<RootNavigator />); });

  const authChanged = onAuthStateChanged.mock.calls.at(-1)[1];
  act(() => { authChanged({ uid: 'u1', email: 'primero@example.test' }); });
  const firstProfileChanged = onSnapshot.mock.calls.at(-1)[1];
  const firstProfileError = onSnapshot.mock.calls.at(-1)[2];

  act(() => { authChanged({ uid: 'u2', email: 'segundo@example.test' }); });
  expect(stopFirstProfile).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);

  act(() => {
    firstProfileChanged({ exists: () => true, data: () => ({ emailVerificado: true }) });
    firstProfileError(new Error('respuesta tardía'));
  });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);

  const secondProfileChanged = onSnapshot.mock.calls.at(-1)[1];
  act(() => { secondProfileChanged({ exists: () => true, data: () => ({ emailVerificado: 'true' }) }); });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);
  act(() => { secondProfileChanged({ exists: () => true, data: () => ({ emailVerificado: false }) }); });
  expect(tree.root.findByType('VerificationScreen').props.user.uid).toBe('u2');

  act(() => { firstProfileChanged({ exists: () => true, data: () => ({ emailVerificado: true }) }); });
  expect(tree.root.findByType('VerificationScreen').props.user.uid).toBe('u2');
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);

  act(() => { tree.unmount(); });
});
