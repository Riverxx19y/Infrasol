import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('../hooks/useNotificaciones', () => ({ useNotificaciones: jest.fn() }));
const { useNotificaciones } = require('../hooks/useNotificaciones');
const StartScreen = require('./StartScreen').default;
global.IS_REACT_ACT_ENVIRONMENT = true;

let onOpenNotifications;
function render(count) {
  useNotificaciones.mockReturnValue({ status: 'ready', pendientes: count, notificaciones: [] });
  onOpenNotifications = jest.fn();
  let tree;
  act(() => { tree = create(<StartScreen user={{ uid: 'owner' }} onOpenNotifications={onOpenNotifications}
    onCreateReport={() => {}} onOpenMap={() => {}} onOpenHistory={() => {}} onSignOut={() => {}} />); });
  return tree;
}
const bell = (tree) => tree.root.findAllByType(TouchableOpacity)
  .find((node) => /notificaciones/i.test(node.props.accessibilityLabel || ''));

beforeEach(() => jest.clearAllMocks());

test('Inicio ciudadano presenta una campana que abre notificaciones', () => {
  const tree = render(1);
  try {
    expect(bell(tree)).toBeDefined();
    act(() => bell(tree).props.onPress());
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});

test('badge indica varios cambios de estado pendientes', () => {
  const tree = render(3);
  try { expect(tree.root.findAllByType(Text).some((node) => node.props.children === '3')).toBe(true); }
  finally { act(() => tree.unmount()); }
});

test('badge no anuncia una cantidad positiva con cero pendientes', () => {
  const tree = render(0);
  try {
    expect(bell(tree)).toBeDefined();
    expect(bell(tree).props.accessibilityLabel).not.toMatch(/[1-9] notificaciones/);
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/"children":"[1-9]"/);
  } finally { act(() => tree.unmount()); }
});
