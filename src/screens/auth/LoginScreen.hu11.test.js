import React from 'react';
import { act, create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('../../services/auth.service', () => ({ iniciarSesion: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

function forgotButton(tree) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === 'Olvidé mi contraseña');
}

test('HU-11: el inicio de sesión ofrece la opción Olvidé mi contraseña', () => {
  const LoginScreen = require('./LoginScreen').default;
  const onForgotPassword = jest.fn();
  let tree;
  act(() => { tree = create(<LoginScreen onForgotPassword={onForgotPassword} />); });

  const button = forgotButton(tree);
  expect(button).toBeDefined();
  act(() => { button.props.onPress(); });
  expect(onForgotPassword).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

test('HU-11: la opción de recuperación no intenta iniciar sesión', () => {
  const { iniciarSesion } = require('../../services/auth.service');
  const LoginScreen = require('./LoginScreen').default;
  let tree;
  act(() => { tree = create(<LoginScreen onForgotPassword={jest.fn()} />); });

  act(() => { forgotButton(tree).props.onPress(); });
  expect(iniciarSesion).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});
