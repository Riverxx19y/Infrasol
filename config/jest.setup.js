// Jest no carga el módulo nativo que usan Firebase Auth y el proveedor de tema.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
