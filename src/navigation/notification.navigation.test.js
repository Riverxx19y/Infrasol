import React from 'react';
import { act, create } from 'react-test-renderer';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), onSnapshot: jest.fn() }));
jest.mock('../screens/auth/RegisterScreen', () => 'RegisterScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/auth/RestrictedAccessScreen', () => 'RestrictedAccessScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen');
jest.mock('../screens/StartScreen', () => 'StartScreen');
jest.mock('../screens/reports/CreateReportScreen', () => 'CreateReportScreen');
jest.mock('../screens/map/MapScreen', () => 'MapScreen');
jest.mock('../screens/reports/MyReportsScreen', () => 'MyReportsScreen');
jest.mock('../screens/notifications/NotificationsScreen', () => 'NotificationsScreen', { virtual: true });

const RootNavigator = require('./RootNavigator').default;
global.IS_REACT_ACT_ENVIRONMENT = true;

function open(user, profile) {
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
  let tree;
  act(() => { tree = create(<RootNavigator />); });
  act(() => onAuthStateChanged.mock.calls.at(-1)[1](user));
  if (user) act(() => onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => profile }));
  return tree;
}

beforeEach(() => jest.clearAllMocks());

test('ciudadano verificado abre notificaciones desde Inicio y puede volver', () => {
  const tree = open({ uid: 'owner' }, { rol: 'ciudadano', emailVerificado: true });
  try {
    const home = tree.root.findByType('StartScreen');
    expect(home.props.onOpenNotifications).toEqual(expect.any(Function));
    act(() => home.props.onOpenNotifications());
    const screen = tree.root.findByType('NotificationsScreen');
    expect(screen.props.uid).toBe('owner');
    act(() => screen.props.onBack());
    expect(tree.root.findByType('StartScreen')).toBeDefined();
  } finally { act(() => tree.unmount()); }
});

test.each([
  [null, null, 'RegisterScreen'],
  [{ uid: 'owner' }, { rol: 'ciudadano', emailVerificado: false }, 'VerificationScreen'],
  [{ uid: 'admin' }, { rol: 'administrador', emailVerificado: true }, 'AdminScreen'],
  [{ uid: 'owner' }, { rol: 'desconocido', emailVerificado: true }, 'RestrictedAccessScreen'],
])('otra ruta conserva protección y no monta NotificationsScreen', (user, profile, expected) => {
  const tree = open(user, profile);
  try {
    expect(tree.root.findAllByType(expected)).toHaveLength(1);
    expect(tree.root.findAllByType('NotificationsScreen')).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});

test('cambio de sesión cierra notificaciones y evita mezclar avisos de usuarios', () => {
  const tree = open({ uid: 'owner' }, { rol: 'ciudadano', emailVerificado: true });
  try {
    const openNotifications = tree.root.findByType('StartScreen').props.onOpenNotifications;
    expect(openNotifications).toEqual(expect.any(Function));
    act(() => openNotifications());
    expect(tree.root.findAllByType('NotificationsScreen')).toHaveLength(1);
    act(() => onAuthStateChanged.mock.calls.at(-1)[1](null));
    expect(tree.root.findAllByType('NotificationsScreen')).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});
