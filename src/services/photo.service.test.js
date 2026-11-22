// La clave de prueba es ficticia; XHR y FormData impiden tráfico real a ImgBB.
const originalKey = process.env.EXPO_PUBLIC_IMGBB_API_KEY;
const originalXHR = global.XMLHttpRequest;
const originalFormData = global.FormData;
let xhr;
let form;

class MockXHR {
  constructor() {
    xhr = this;
    this.open = jest.fn();
    this.send = jest.fn();
  }
}

class MockFormData {
  constructor() {
    form = this;
    this.append = jest.fn();
  }
}

const subirFoto = (base64) => require('./photo.service').subirFoto(base64);

beforeEach(() => {
  xhr = undefined;
  form = undefined;
  process.env.EXPO_PUBLIC_IMGBB_API_KEY = 'test-public-key';
  global.XMLHttpRequest = MockXHR;
  global.FormData = MockFormData;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_IMGBB_API_KEY;
  else process.env.EXPO_PUBLIC_IMGBB_API_KEY = originalKey;
  global.XMLHttpRequest = originalXHR;
  global.FormData = originalFormData;
});

test('HU-03 RED 2: envía una fotografía válida a ImgBB y devuelve la URL', async () => {
  const pending = subirFoto('BASE64_DE_PRUEBA');
  expect(xhr.open).toHaveBeenCalledWith('POST', expect.stringContaining('https://api.imgbb.com/1/upload'));
  expect(xhr.open.mock.calls[0][1]).toContain('test-public-key');
  expect(form.append).toHaveBeenCalledWith('image', 'BASE64_DE_PRUEBA');
  expect(xhr.send).toHaveBeenCalledWith(form);

  xhr.status = 200;
  xhr.responseText = JSON.stringify({ success: true, data: { url: 'https://i.ibb.co/reporte.jpg' } });
  xhr.onload();
  await expect(pending).resolves.toBe('https://i.ibb.co/reporte.jpg');
});

test('HU-03 RED 2: rechaza una respuesta HTTP fallida', async () => {
  const pending = subirFoto('BASE64_DE_PRUEBA');
  xhr.status = 503;
  xhr.responseText = JSON.stringify({ success: false, error: { message: 'Servicio no disponible' } });
  xhr.onload();
  await expect(pending).rejects.toThrow(/servicio|HTTP|subida|ImgBB/i);
});

test('HU-03 RED 2: informa un fallo de red', async () => {
  const pending = subirFoto('BASE64_DE_PRUEBA');
  xhr.onerror();
  await expect(pending).rejects.toThrow(/red|conexión|subida/i);
});

test('HU-03 RED 2: no acepta una respuesta sin URL de imagen', async () => {
  const pending = subirFoto('BASE64_DE_PRUEBA');
  xhr.status = 200;
  xhr.responseText = JSON.stringify({ success: true, data: {} });
  xhr.onload();
  await expect(pending).rejects.toThrow();
});

test('HU-03 RED 2: no envía una fotografía si falta la clave pública configurada', async () => {
  delete process.env.EXPO_PUBLIC_IMGBB_API_KEY;
  await expect(subirFoto('BASE64_DE_PRUEBA')).rejects.toThrow(/ImgBB|clave|configur/i);
  expect(xhr?.send).not.toHaveBeenCalled();
});
