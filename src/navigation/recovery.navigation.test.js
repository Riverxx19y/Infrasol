import React from 'react';
import { act, create } from 'react-test-renderer';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import RootNavigator from './RootNavigator';

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((database, collection, id) => ({ collection, id })),
  onSnapshot: jest.fn(),
}));
jest.mock('../screens/auth/LoginScreen', () => 'LoginScreen');
jest.mock('../screens/auth/RegisterScreen', () => 'RegisterScreen');
jest.mock('../screens/auth/RecoverPasswordScreen', () => 'RecoverPasswordScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/StartScreen', () => 'StartScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen');

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  jest.clearAllMocks();
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
});

function mountAtLogin() {
  let tree;
  act(() => { tree = create(<RootNavigator />); });
  const authChanged = onAuthStateChanged.mock.calls.at(-1)[1];
  act(() => { authChanged(null); });
  act(() => { tree.root.findByType('RegisterScreen').props.onLogin(); });
  return { tree, authChanged };
}

test('HU-11: desde el inicio de sesión navega a recuperar contraseña y regresa', () => {
  const { tree } = mountAtLogin();
  const login = tree.root.findByType('LoginScreen');
  expect(login.props.onForgotPassword).toEqual(expect.any(Function));

  act(() => { login.props.onForgotPassword(); });
  expect(tree.root.findAllByType('RecoverPasswordScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('LoginScreen')).toHaveLength(0);
  expect(tree.root.findByType('RecoverPasswordScreen').props.onBack).toEqual(expect.any(Function));

  act(() => { tree.root.findByType('RecoverPasswordScreen').props.onBack(); });
  expect(tree.root.findAllByType('LoginScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('RecoverPasswordScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test('HU-11: la recuperación no concede acceso a pantallas protegidas', () => {
  const { tree } = mountAtLogin();
  act(() => { tree.root.findByType('LoginScreen').props.onForgotPassword(); });

  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);
  expect(tree.root.findAllByType('AdminScreen')).toHaveLength(0);
  expect(tree.root.findAllByType('VerificationScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test('HU-11: si se inicia sesión mientras se recupera, se sale de la recuperación', () => {
  const { tree, authChanged } = mountAtLogin();
  act(() => { tree.root.findByType('LoginScreen').props.onForgotPassword(); });

  act(() => { authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: true }) }); });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('RecoverPasswordScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});
