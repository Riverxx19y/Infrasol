import React from 'react';
import { act, create } from 'react-test-renderer';
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
jest.mock('../screens/auth/RestrictedAccessScreen', () => 'RestrictedAccessScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen');
jest.mock('../screens/StartScreen', () => 'StartScreen');
jest.mock('../screens/reports/CreateReportScreen', () => 'CreateReportScreen', { virtual: true });

const RootNavigator = require('./RootNavigator').default;
global.IS_REACT_ACT_ENVIRONMENT = true;

function openWith(user, profile) {
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
  let tree;
  act(() => { tree = create(<RootNavigator />); });
  act(() => { onAuthStateChanged.mock.calls.at(-1)[1](user); });
  if (user) {
    act(() => {
      onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => profile });
    });
  }
  return tree;
}

beforeEach(() => jest.clearAllMocks());

test('el ciudadano verificado puede abrir el formulario desde su pantalla inicial', () => {
  const user = { uid: 'ciudadano-1' };
  const tree = openWith(user, { rol: 'ciudadano', emailVerificado: true });
  const start = tree.root.findByType('StartScreen');
  try {
    expect(start.props.onCreateReport).toEqual(expect.any(Function));
    act(() => { start.props.onCreateReport(); });
    expect(tree.root.findByType('CreateReportScreen').props.user).toEqual(user);
  } finally {
    act(() => { tree.unmount(); });
  }
});

test.each([
  ['sin sesión', null, null, 'RegisterScreen'],
  ['sin verificación', { uid: 'u1' }, { rol: 'ciudadano', emailVerificado: false }, 'VerificationScreen'],
  ['rol desconocido', { uid: 'u1' }, { rol: 'desconocido', emailVerificado: true }, 'RestrictedAccessScreen'],
  ['administrador', { uid: 'admin-1' }, { rol: 'administrador', emailVerificado: true }, 'AdminScreen'],
])('%s conserva su ruta y no accede al formulario ciudadano', (label, user, profile, expected) => {
  const tree = openWith(user, profile);
  if (label === 'administrador') {
    expect(JSON.stringify(tree.toJSON())).toMatch(/Panel de administraci[oó]n/);
  } else {
    expect(tree.root.findAllByType(expected)).toHaveLength(1);
  }
  expect(tree.root.findAllByType('CreateReportScreen')).toHaveLength(0);
  act(() => { tree.unmount(); });
});
