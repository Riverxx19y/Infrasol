import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ auth: { currentUser: { uid: 'owner' } }, db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((database, name) => ({ name })),
  doc: jest.fn((database, name, id) => ({ name, id })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn((...args) => ({ orderBy: args })),
  query: jest.fn((reference, ...constraints) => ({ reference, constraints })),
  updateDoc: jest.fn(),
  where: jest.fn((...args) => ({ where: args })),
}));

const { auth } = require('../../config/firebase');
// RED: un módulo todavía inexistente falla en las expectativas, no en la carga de Jest.
const implementation = existsSync(join(__dirname, 'notifications.service.js'))
  ? require('./notifications.service') : {};
const { suscribirNotificaciones, marcarNotificacionLeida } = implementation;

const notice = (id, data) => ({ id, data: () => data });
let stop;
beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'owner' };
  stop = jest.fn();
  onSnapshot.mockReturnValue(stop);
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ usuarioId: 'owner', leida: false }) });
});

test('consulta solo avisos del UID autenticado en fecha descendente y devuelve cancelación', () => {
  expect(suscribirNotificaciones).toEqual(expect.any(Function));
  const unsubscribe = suscribirNotificaciones(jest.fn(), jest.fn());
  expect(collection).toHaveBeenCalledWith(expect.anything(), 'notificaciones');
  expect(where).toHaveBeenCalledWith('usuarioId', '==', 'owner');
  expect(orderBy).toHaveBeenCalledWith('fecha', 'desc');
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toEqual(expect.any(Function));
  unsubscribe();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('entrega avisos de cambio de estado y apoyo; leida ausente sigue pendiente', () => {
  expect(suscribirNotificaciones).toEqual(expect.any(Function));
  const receive = jest.fn();
  suscribirNotificaciones(receive, jest.fn());
  onSnapshot.mock.calls[0][1]({ docs: [
    notice('estado_r1_1', { tipo: 'cambio_estado', usuarioId: 'owner', reporteId: 'r1', estadoAnterior: 'Pendiente', estadoNuevo: 'En revisión', leida: false }),
    notice('r2_supporter', { tipo: 'apoyo', usuarioId: 'owner', reporteId: 'r2', apoyadorId: 'supporter' }),
  ] });
  expect(receive).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ id: 'estado_r1_1', tipo: 'cambio_estado', estadoAnterior: 'Pendiente', estadoNuevo: 'En revisión' }),
    expect.objectContaining({ id: 'r2_supporter', tipo: 'apoyo', reporteId: 'r2' }),
  ]));
  const support = receive.mock.calls[0][0].find((item) => item.id === 'r2_supporter');
  expect(support.leida).not.toBe(true);
});

test('propaga errores de la suscripción para mostrar error y permitir reintento', () => {
  expect(suscribirNotificaciones).toEqual(expect.any(Function));
  const onError = jest.fn();
  suscribirNotificaciones(jest.fn(), onError);
  const failure = new Error('Firestore no disponible');
  onSnapshot.mock.calls[0][2](failure);
  expect(onError).toHaveBeenCalledWith(failure);
});

test('no abre una suscripción sin sesión', () => {
  expect(suscribirNotificaciones).toEqual(expect.any(Function));
  auth.currentUser = null;
  expect(() => suscribirNotificaciones(jest.fn(), jest.fn())).toThrow(/sesión|inicia sesión/i);
  expect(onSnapshot).not.toHaveBeenCalled();
});

test('marca solo leida: true en un aviso propio', async () => {
  expect(marcarNotificacionLeida).toEqual(expect.any(Function));
  await marcarNotificacionLeida('estado_r1_1');
  expect(getDoc).toHaveBeenCalledWith({ name: 'notificaciones', id: 'estado_r1_1' });
  expect(updateDoc).toHaveBeenCalledWith({ name: 'notificaciones', id: 'estado_r1_1' }, { leida: true });
});

test('no vuelve a escribir un aviso propio ya leído', async () => {
  expect(marcarNotificacionLeida).toEqual(expect.any(Function));
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ usuarioId: 'owner', leida: true }) });
  await marcarNotificacionLeida('estado_r1_1');
  expect(updateDoc).not.toHaveBeenCalled();
});

test('marca un aviso histórico sin leida y rechaza uno ajeno', async () => {
  expect(marcarNotificacionLeida).toEqual(expect.any(Function));
  getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ usuarioId: 'owner', tipo: 'apoyo' }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ usuarioId: 'other', leida: false }) });
  await marcarNotificacionLeida('r2_supporter');
  expect(updateDoc).toHaveBeenCalledWith({ name: 'notificaciones', id: 'r2_supporter' }, { leida: true });
  await expect(marcarNotificacionLeida('foreign')).rejects.toThrow();
  expect(updateDoc).toHaveBeenCalledTimes(1);
});

test('un fallo de Firestore al marcar no confirma éxito', async () => {
  expect(marcarNotificacionLeida).toEqual(expect.any(Function));
  updateDoc.mockRejectedValue(new Error('Firestore no disponible'));
  await expect(marcarNotificacionLeida('estado_r1_1')).rejects.toThrow(/Firestore/);
});
