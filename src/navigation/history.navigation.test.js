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
jest.mock('../screens/auth/LoginScreen', () => 'LoginScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/auth/RestrictedAccessScreen', () => 'RestrictedAccessScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen');
jest.mock('../screens/reports/CreateReportScreen', () => 'CreateReportScreen');
jest.mock('../screens/map/MapScreen', () => 'MapScreen');
// virtual solo mientras la pantalla no exista (RED); cuando exista se simula el archivo real.
jest.mock('../screens/reports/MyReportsScreen', () => 'MyReportsScreen', {
  virtual: !require('node:fs').existsSync(
    require('node:path').join(__dirname, '..', 'screens', 'reports', 'MyReportsScreen.js'),
  ),
});

const RootNavigator = require('./RootNavigator').default;
global.IS_REACT_ACT_ENVIRONMENT = true;

const CIUDADANO = { rol: 'ciudadano', emailVerificado: true };
const buttons = (tree) => tree.root.findAll((node) => node.props.accessibilityRole === 'button'
  && typeof node.props.onPress === 'function');
const button = (tree, label) => buttons(tree).find((node) => node.props.accessibilityLabel === label);

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

test('el ciudadano verificado abre Mis reportes desde el inicio y conserva HU-03 y HU-04', () => {
  const tree = openWith({ uid: 'u1' }, CIUDADANO);
  try {
    expect(button(tree, 'Crear reporte')).toBeDefined();
    expect(button(tree, 'Ver mapa de reportes')).toBeDefined();
    const history = button(tree, 'Mis reportes');
    expect(history).toBeDefined();
    act(() => history.props.onPress());
    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(1);
    expect(tree.root.findAllByType('MapScreen')).toHaveLength(0);
    expect(tree.root.findAllByType('CreateReportScreen')).toHaveLength(0);
  } finally {
    act(() => tree.unmount());
  }
});

test.each([
  ['sin sesión', null, null, 'RegisterScreen'],
  ['sin verificar', { uid: 'u1' }, { rol: 'ciudadano', emailVerificado: false }, 'VerificationScreen'],
  ['rol desconocido', { uid: 'u1' }, { rol: 'desconocido', emailVerificado: true }, 'RestrictedAccessScreen'],
  ['administrador', { uid: 'admin' }, { rol: 'administrador', emailVerificado: true }, 'AdminScreen'],
])('%s conserva su ruta y no puede acceder al historial', (label, user, profile, route) => {
  const tree = openWith(user, profile);
  try {
    expect(tree.root.findAllByType(route)).toHaveLength(1);
    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(0);
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Mis reportes')).toHaveLength(0);
  } finally {
    act(() => tree.unmount());
  }
});

test('Volver desde Mis reportes regresa al inicio con todas sus opciones', () => {
  const tree = openWith({ uid: 'u1' }, CIUDADANO);
  try {
    const history = button(tree, 'Mis reportes');
    expect(history).toBeDefined();
    act(() => history.props.onPress());
    const screen = tree.root.findByType('MyReportsScreen');
    expect(screen.props.onBack).toEqual(expect.any(Function));
    act(() => screen.props.onBack());
    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(0);
    expect(button(tree, 'Crear reporte')).toBeDefined();
    expect(button(tree, 'Ver mapa de reportes')).toBeDefined();
    expect(button(tree, 'Mis reportes')).toBeDefined();
  } finally {
    act(() => tree.unmount());
  }
});

test('un cambio de sesión reinicia la navegación del historial', () => {
  const tree = openWith({ uid: 'u1' }, CIUDADANO);
  try {
    const history = button(tree, 'Mis reportes');
    expect(history).toBeDefined();
    act(() => history.props.onPress());
    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(1);

    act(() => { onAuthStateChanged.mock.calls.at(-1)[1]({ uid: 'u2' }); });
    act(() => {
      onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => CIUDADANO });
    });

    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(0);
    expect(button(tree, 'Mis reportes')).toBeDefined();
  } finally {
    act(() => tree.unmount());
  }
});

test('cerrar sesión desde el historial no deja la pantalla accesible', () => {
  const tree = openWith({ uid: 'u1' }, CIUDADANO);
  try {
    const history = button(tree, 'Mis reportes');
    expect(history).toBeDefined();
    act(() => history.props.onPress());
    act(() => { onAuthStateChanged.mock.calls.at(-1)[1](null); });
    expect(tree.root.findAllByType('MyReportsScreen')).toHaveLength(0);
    expect(tree.root.findAllByType('RegisterScreen').length
      + tree.root.findAllByType('LoginScreen').length).toBe(1);
  } finally {
    act(() => tree.unmount());
  }
});
