jest.mock('../../config/firebase', () => ({ auth: { currentUser: { uid: 'ciudadano-1' } }, db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((database, name) => ({ name })),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

const { auth } = require('../../config/firebase');
const { collection, addDoc } = require('firebase/firestore');
const crearReporte = (data) => require('./reports.service').crearReporte(data);
const validReport = { tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978 };

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'ciudadano-1' };
  addDoc.mockResolvedValue({ id: 'reporte-1' });
});

test('crea en reportes un documento con tipo, descripción y coordenadas', async () => {
  await crearReporte(validReport);
  expect(collection).toHaveBeenCalledWith(expect.anything(), 'reportes');
  expect(addDoc).toHaveBeenCalledWith(
    { name: 'reportes' },
    expect.objectContaining({ tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978 }),
  );
});

test('asocia el reporte al UID autenticado y establece Pendiente exactamente', async () => {
  await crearReporte({ ...validReport, usuarioId: 'uid-falsificado' });
  expect(addDoc.mock.calls[0][1]).toEqual(
    expect.objectContaining({ usuarioId: 'ciudadano-1', estado: 'Pendiente' }),
  );
});

test('permite crear el reporte sin fotografía', async () => {
  await expect(crearReporte(validReport)).resolves.toBeTruthy();
  expect(addDoc.mock.calls[0][1].fotoUrl).toBeFalsy();
});

test.each([
  { ...validReport, tipo: '' },
  { ...validReport, tipo: '   ' },
  { ...validReport, descripcion: '' },
  { ...validReport, descripcion: '   ' },
  { ...validReport, lat: 91 },
  { ...validReport, lng: -181 },
])('rechaza datos obligatorios o coordenadas inválidas antes de escribir: %p', async (data) => {
  await expect(crearReporte(data)).rejects.toThrow();
  expect(addDoc).not.toHaveBeenCalled();
});

test('rechaza crear un reporte sin ciudadano autenticado', async () => {
  auth.currentUser = null;
  await expect(crearReporte(validReport)).rejects.toThrow();
  expect(addDoc).not.toHaveBeenCalled();
});

test('propaga el error de Firestore sin confirmar una creación inexistente', async () => {
  addDoc.mockRejectedValue(new Error('Firestore no disponible'));
  await expect(crearReporte(validReport)).rejects.toThrow('Firestore no disponible');
  expect(addDoc).toHaveBeenCalledTimes(1);
});
