jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

const Location = require('expo-location');

const obtenerUbicacionActual = () => require('./location.service').obtenerUbicacionActual();

beforeEach(() => {
  jest.clearAllMocks();
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 9.3047, longitude: -75.3978 } });
  Location.reverseGeocodeAsync.mockResolvedValue([{ street: 'Calle 1', city: 'Sincelejo' }]);
});

test('solicita permiso antes de consultar el GPS y devuelve las coordenadas', async () => {
  const result = await obtenerUbicacionActual();
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  expect(Location.requestForegroundPermissionsAsync.mock.invocationCallOrder[0])
    .toBeLessThan(Location.getCurrentPositionAsync.mock.invocationCallOrder[0]);
  expect(result).toEqual(expect.objectContaining({ latitude: 9.3047, longitude: -75.3978 }));
});

test('rechaza permiso denegado sin consultar el GPS', async () => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
  await expect(obtenerUbicacionActual()).rejects.toThrow(/permiso|ubicaci[oó]n/i);
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test.each([
  [91, 0], [-91, 0], [0, 181], [0, -181], [NaN, 0], [0, Infinity], [null, 0], [0, undefined],
])('rechaza coordenadas GPS inválidas (%s, %s)', async (latitude, longitude) => {
  Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude, longitude } });
  await expect(obtenerUbicacionActual()).rejects.toThrow(/coordenad|ubicaci[oó]n/i);
});

test('acepta los límites válidos de latitud y longitud', async () => {
  Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: -90, longitude: 180 } });
  await expect(obtenerUbicacionActual()).resolves.toEqual(
    expect.objectContaining({ latitude: -90, longitude: 180 }),
  );
});

test('informa un fallo del proveedor GPS', async () => {
  Location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS no disponible'));
  await expect(obtenerUbicacionActual()).rejects.toThrow(/GPS|ubicaci[oó]n/i);
});

test('intenta geocodificación inversa con las coordenadas obtenidas', async () => {
  const result = await obtenerUbicacionActual();
  expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({ latitude: 9.3047, longitude: -75.3978 });
  expect(result.direccion).toMatch(/Calle 1|Sincelejo/);
});

test('conserva las coordenadas si no se encuentra una dirección', async () => {
  Location.reverseGeocodeAsync.mockResolvedValue([]);
  await expect(obtenerUbicacionActual()).resolves.toEqual(
    expect.objectContaining({ latitude: 9.3047, longitude: -75.3978 }),
  );
});

test('conserva las coordenadas si falla la geocodificación inversa', async () => {
  Location.reverseGeocodeAsync.mockRejectedValue(new Error('Geocodificación no disponible'));
  await expect(obtenerUbicacionActual()).resolves.toEqual(
    expect.objectContaining({ latitude: 9.3047, longitude: -75.3978 }),
  );
});
