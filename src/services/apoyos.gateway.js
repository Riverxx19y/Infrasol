import { auth } from '../../config/firebase';

export async function apoyarReporte(reporteId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para apoyar un reporte.');
  if (typeof reporteId !== 'string' || !reporteId.trim()) throw new Error('Selecciona un reporte válido.');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) throw new Error('Falta EXPO_PUBLIC_API_URL. Configura el backend y reinicia Expo.');
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/reportes/${encodeURIComponent(reporteId)}/apoyos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de apoyos. Comprueba la red e inténtalo de nuevo.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error?.message || `No se pudo apoyar el reporte (HTTP ${response.status}).`);
  if (typeof result?.apoyado !== 'boolean' || !Number.isSafeInteger(result?.apoyos) || result.apoyos < 0) {
    throw new Error('El servidor devolvió una respuesta de apoyo inválida.');
  }
  return { apoyado: result.apoyado, apoyos: result.apoyos };
}
