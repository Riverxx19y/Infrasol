import { auth } from '../../config/firebase';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validPhotoUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'i.ibb.co'
      && !url.username && !url.password && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export async function subirFoto(imageBase64) {
  if (typeof imageBase64 !== 'string') {
    throw new Error('Selecciona una fotografía válida antes de subirla.');
  }
  const base64 = imageBase64.trim().replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  if (base64.length * 3 / 4 - padding > MAX_IMAGE_BYTES) {
    throw new Error('La fotografía supera 5 MiB. Selecciona una más pequeña.');
  }
  if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error('Selecciona una fotografía válida antes de subirla.');
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) throw new Error('Falta EXPO_PUBLIC_API_URL. Configura la dirección del backend y reinicia Expo.');
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para subir una fotografía.');
  const token = await user.getIdToken();

  let response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/images/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de imágenes. Comprueba la red e inténtalo de nuevo.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('La sesión no es válida. Inicia sesión de nuevo.');
    if (response.status === 413) throw new Error('La fotografía es demasiado grande. Selecciona una más pequeña.');
    throw new Error(result?.error?.message || `No se pudo subir la fotografía (HTTP ${response.status}).`);
  }
  if (!validPhotoUrl(result?.fotoUrl)) {
    throw new Error('El servidor devolvió una URL de fotografía inválida.');
  }
  return result.fotoUrl;
}
