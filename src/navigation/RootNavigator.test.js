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

  act(() => { profileChanged({ exists: () => true, data: () => ({ emailVerificado: true }) }); });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(1);
});
