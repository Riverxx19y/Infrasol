jest.mock('../../config/firebase', () => ({
  auth: { currentUser: { uid: 'citizen-1', getIdToken: jest.fn().mockResolvedValue('test-token') } },
}));

const originalUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000/';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ enviado: true }) });
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  delete global.fetch;
});

test('envía el token Firebase y utiliza la URL pública sin enviar el UID como autoridad', async () => {
  const { otpGateway } = require('./otp.gateway');
  await expect(otpGateway.solicitarCodigo({ uid: 'citizen-1' })).resolves.toEqual({ enviado: true });
  expect(fetch).toHaveBeenCalledWith('http://192.0.2.10:3000/api/otp/solicitar', expect.objectContaining({
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: '{}',
  }));
  await expect(otpGateway.verificarCodigo({ uid: 'citizen-1', codigo: '123456' })).resolves.toEqual({ enviado: true });
  expect(fetch.mock.calls[1][1].body).toBe('{"codigo":"123456"}');
});

test('propaga errores HTTP y bloquea una sesión que no coincide', async () => {
  const { otpGateway } = require('./otp.gateway');
  global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { message: 'Espera 60 segundos.' } }) });
  await expect(otpGateway.reenviarCodigo({ uid: 'citizen-1' })).rejects.toThrow(/60 segundos/);
  await expect(otpGateway.verificarCodigo({ uid: 'other', codigo: '123456' })).rejects.toThrow(/sesión/);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('informa cuando falta la URL o no se puede alcanzar Express', async () => {
  delete process.env.EXPO_PUBLIC_API_URL;
  let { otpGateway } = require('./otp.gateway');
  await expect(otpGateway.solicitarCodigo({ uid: 'citizen-1' })).rejects.toThrow(/EXPO_PUBLIC_API_URL/);

  jest.resetModules();
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000';
  ({ otpGateway } = require('./otp.gateway'));
  global.fetch.mockRejectedValue(new Error('network unavailable'));
  await expect(otpGateway.reenviarCodigo({ uid: 'citizen-1' })).rejects.toThrow(/No se pudo conectar/);
});
