import { auth } from '../../config/firebase';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

async function requestOtp(path, { uid, codigo } = {}) {
  const user = auth.currentUser;
  if (!user || !uid || user.uid !== uid) {
    throw new Error('La sesión no corresponde a la cuenta pendiente de verificación.');
  }
  if (!apiUrl?.trim()) {
    throw new Error('Falta EXPO_PUBLIC_API_URL. Configura la dirección del backend y reinicia Expo.');
  }
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/otp/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(codigo === undefined ? {} : { codigo }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de verificación. Comprueba la red y la dirección configurada.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error?.message || `El servidor de verificación respondió con HTTP ${response.status}.`);
  }
  return result;
}

export const otpGateway = {
  solicitarCodigo: (data) => requestOtp('solicitar', data),
  verificarCodigo: (data) => requestOtp('verificar', data),
  reenviarCodigo: (data) => requestOtp('reenviar', data),
};
