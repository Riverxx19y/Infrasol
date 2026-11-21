import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

jest.mock('../../services/auth.service', () => ({ iniciarSesion: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

test('HU-02: Entrar con credenciales incorrectas muestra error y conserva el formulario', async () => {
  const { iniciarSesion } = require('../../services/auth.service');
  iniciarSesion.mockRejectedValue(Object.assign(new Error('Credenciales incorrectas'), {
    code: 'auth/invalid-credential',
  }));
  const LoginScreen = require('./LoginScreen').default;
  const onLogin = jest.fn();
  let tree;
  act(() => { tree = create(<LoginScreen onLogin={onLogin} />); });

  act(() => {
    const inputs = tree.root.findAllByType(TextInput);
    inputs.find((input) => input.props.accessibilityLabel === 'Correo electrónico')
      .props.onChangeText('ana@example.test');
    inputs.find((input) => input.props.accessibilityLabel === 'Contraseña')
      .props.onChangeText('incorrecta');
  });
  const enter = tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === 'Entrar');
  await act(async () => { await enter.props.onPress(); });

  expect(iniciarSesion).toHaveBeenCalledWith('ana@example.test', 'incorrecta');
  const alerts = tree.root.findAllByType(View)
    .filter((view) => view.props.accessibilityRole === 'alert');
  expect(alerts).toHaveLength(1);
  expect(alerts[0].findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && /correo|contraseña|credenciales/i.test(text.props.children)
  )).toBe(true);
  expect(onLogin).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(TextInput)).toHaveLength(2);
  act(() => { tree.unmount(); });
});

test('HU-02: Entrar con credenciales válidas entrega el usuario sin mostrar error', async () => {
  const { iniciarSesion } = require('../../services/auth.service');
  const LoginScreen = require('./LoginScreen').default;
  const user = { uid: 'u1', email: 'ana@example.test' };
  iniciarSesion.mockResolvedValue(user);
  const onLogin = jest.fn();
  let tree;
  act(() => { tree = create(<LoginScreen onLogin={onLogin} />); });

  act(() => {
    const inputs = tree.root.findAllByType(TextInput);
    inputs.find((input) => input.props.accessibilityLabel === 'Correo electrónico')
      .props.onChangeText(user.email);
    inputs.find((input) => input.props.accessibilityLabel === 'Contraseña')
      .props.onChangeText('ClaveSegura123');
  });
  const enter = tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === 'Entrar');
  await act(async () => { await enter.props.onPress(); });

  expect(iniciarSesion).toHaveBeenCalledWith(user.email, 'ClaveSegura123');
  expect(onLogin).toHaveBeenCalledWith(user);
  expect(tree.root.findAllByType(View)
    .filter((view) => view.props.accessibilityRole === 'alert')).toHaveLength(0);
  act(() => { tree.unmount(); });
});
