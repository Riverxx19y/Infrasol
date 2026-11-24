import React from 'react';
import { act, create } from 'react-test-renderer';
import { useCooldown } from './useCooldown';

global.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => jest.useRealTimers());

function mount(durationMs) {
  const state = {};
  function Probe() {
    Object.assign(state, useCooldown(durationMs));
    return null;
  }
  let tree;
  act(() => { tree = create(<Probe />); });
  return { state, tree };
}

test('HU-11: la espera se activa al iniciarse y termina al cumplirse el plazo', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  const { state, tree } = mount(60_000);

  expect(state.active).toBe(false);
  act(() => { state.start(); });
  expect(state.active).toBe(true);
  act(() => { jest.advanceTimersByTime(59_999); });
  expect(state.active).toBe(true);
  act(() => { jest.advanceTimersByTime(1); });
  expect(state.active).toBe(false);
  act(() => { tree.unmount(); });
});

test('HU-11: desmontar durante la espera no deja temporizadores pendientes', () => {
  jest.useFakeTimers();
  const { state, tree } = mount(60_000);
  act(() => { state.start(); });
  act(() => { tree.unmount(); });
  expect(jest.getTimerCount()).toBe(0);
});
