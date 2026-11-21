import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import RootNavigator from './RootNavigator';

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((database, collection, id) => ({ collection, id })),
  onSnapshot: jest.fn(),
}));
jest.mock('../screens/auth/LoginScreen', () => 'LoginScreen', { virtual: true });
jest.mock('../screens/auth/RegisterScreen', () => 'RegisterScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/StartScreen', () => 'StartScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen', { virtual: true });

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  jest.clearAllMocks();
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
});

function mountNavigator() {
  let tree;
  act(() => { tree = create(<RootNavigator />); });
  return { tree, authChanged: onAuthStateChanged.mock.calls.at(-1)[1] };
}

test('HU-02: sin sesión ofrece inicio de sesión y acceso al registro de HU-01', () => {
  const { tree, authChanged } = mountNavigator();
  act(() => { authChanged(null); });

  expect(tree.root.findAllByType('RegisterScreen')).toHaveLength(1);
  expect(tree.root.findByType('RegisterScreen').props.onLogin).toEqual(expect.any(Function));
  act(() => { tree.root.findByType('RegisterScreen').props.onLogin(); });
  expect(tree.root.findAllByType('LoginScreen')).toHaveLength(1);
  expect(tree.root.findByType('LoginScreen').props.onRegister).toEqual(expect.any(Function));
  act(() => { tree.root.findByType('LoginScreen').props.onRegister(); });
  expect(tree.root.findAllByType('RegisterScreen')).toHaveLength(1);
  act(() => { tree.unmount(); });
});

test('HU-02: dirige la sesión verificada a las pantallas permitidas por rol', () => {
  const { tree, authChanged } = mountNavigator();
  act(() => { authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  const profileChanged = onSnapshot.mock.calls.at(-1)[1];
  act(() => { profileChanged({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: true }) }); });
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('AdminScreen')).toHaveLength(0);

  act(() => { profileChanged({ exists: () => true, data: () => ({ rol: 'administrador', emailVerificado: true }) }); });
  expect(tree.root.findAllByType('AdminScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test.each([
  ['desconocido', { rol: 'desconocido', emailVerificado: true }],
  ['nulo', { rol: null, emailVerificado: true }],
  ['ausente', { emailVerificado: true }],
])('HU-02: bloquea el acceso protegido cuando el rol es %s', (description, profile) => {
  const { tree, authChanged } = mountNavigator();
  act(() => { authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => profile }); });

  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);
  expect(tree.root.findAllByType('AdminScreen')).toHaveLength(0);
  expect(tree.root.findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && /acceso restringido/i.test(text.props.children)
  )).toBe(true);
  act(() => { tree.unmount(); });
});

test('HU-02: permite cerrar sesión desde el acceso restringido', async () => {
  signOut.mockResolvedValue();
  const { tree, authChanged } = mountNavigator();
  act(() => { authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol: 'desconocido', emailVerificado: true }) }); });

  const button = tree.root.findAllByType(TouchableOpacity)
    .find((item) => item.props.accessibilityLabel === 'Cerrar sesión');
  expect(button).toBeDefined();
  await act(async () => { await button.props.onPress(); });
  expect(signOut).toHaveBeenCalledWith(expect.anything());
  act(() => { authChanged(null); });
  expect(tree.root.findAllByType('LoginScreen')).toHaveLength(1);
  act(() => { tree.unmount(); });
});

test('HU-02: un correo no verificado sigue bloqueado aunque el rol sea ciudadano', () => {
  const { tree, authChanged } = mountNavigator();
  act(() => { authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: false }) }); });

  expect(tree.root.findAllByType('VerificationScreen')).toHaveLength(1);
  expect(tree.root.findAllByType('StartScreen')).toHaveLength(0);
  expect(tree.root.findAllByType('AdminScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test('HU-02: al reabrir recupera la sesión y no vuelve a pedir credenciales', () => {
  const first = mountNavigator();
  act(() => { first.authChanged(null); });
  act(() => { first.tree.root.findByType('RegisterScreen').props.onLogin(); });
  expect(first.tree.root.findAllByType('LoginScreen')).toHaveLength(1);
  act(() => { first.authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: true }) }); });
  expect(first.tree.root.findAllByType('StartScreen')).toHaveLength(1);
  act(() => { first.tree.unmount(); });

  const reopened = mountNavigator();
  act(() => { reopened.authChanged({ uid: 'u1', email: 'ana@example.test' }); });
  act(() => { onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol: 'ciudadano', emailVerificado: true }) }); });
  expect(reopened.tree.root.findAllByType('StartScreen')).toHaveLength(1);
  expect(reopened.tree.root.findAllByType('LoginScreen')).toHaveLength(0);
  act(() => { reopened.tree.unmount(); });
});
