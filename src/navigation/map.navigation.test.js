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
jest.mock('../screens/reports/CreateReportScreen', () => 'CreateReportScreen');
jest.mock('../screens/map/MapScreen', () => 'MapScreen', { virtual: true });

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

test('el ciudadano verificado abre el mapa desde la pantalla inicial y conserva la creación de reportes', () => {
  const tree = openWith({ uid: 'u1' }, { rol: 'ciudadano', emailVerificado: true });
  try {
    const buttons = tree.root.findAll((node) => node.props.accessibilityRole === 'button');
    expect(buttons.some((node) => node.props.accessibilityLabel === 'Crear reporte')).toBe(true);
    const openMap = buttons.find((node) => node.props.accessibilityLabel === 'Ver mapa de reportes');
    expect(openMap).toBeDefined();
    act(() => openMap.props.onPress());
    expect(tree.root.findAllByType('MapScreen')).toHaveLength(1);
  } finally {
    act(() => tree.unmount());
  }
});

test.each([
  ['sin sesión', null, null, 'RegisterScreen'],
  ['sin verificar', { uid: 'u1' }, { rol: 'ciudadano', emailVerificado: false }, 'VerificationScreen'],
  ['rol desconocido', { uid: 'u1' }, { rol: 'desconocido', emailVerificado: true }, 'RestrictedAccessScreen'],
  ['administrador', { uid: 'admin' }, { rol: 'administrador', emailVerificado: true }, 'AdminScreen'],
])('%s conserva su ruta y no puede abrir el mapa ciudadano', (label, user, profile, route) => {
  const tree = openWith(user, profile);
  try {
    if (route === 'AdminScreen') {
      const mocked = tree.root.findAllByType('AdminScreen').length === 1;
      const rendered = /Panel de administraci[oó]n/.test(JSON.stringify(tree.toJSON()));
      expect(mocked || rendered).toBe(true);
    } else {
      expect(tree.root.findAllByType(route)).toHaveLength(1);
    }
    expect(tree.root.findAllByType('MapScreen')).toHaveLength(0);
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Ver mapa de reportes')).toHaveLength(0);
  } finally {
    act(() => tree.unmount());
  }
});

test('volver del mapa devuelve al inicio sin perder el acceso a HU-03', () => {
  const tree = openWith({ uid: 'u1' }, { rol: 'ciudadano', emailVerificado: true });
  try {
    const openMap = tree.root.findAll((node) => node.props.accessibilityLabel === 'Ver mapa de reportes')[0];
    expect(openMap).toBeDefined();
    act(() => openMap.props.onPress());
    const map = tree.root.findByType('MapScreen');
    expect(map.props.onBack).toEqual(expect.any(Function));
    act(() => map.props.onBack());
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Crear reporte')).toHaveLength(1);
  } finally {
    act(() => tree.unmount());
  }
});
