import { auth } from '../../config/firebase';

const HTTP_MESSAGES = {
  400: 'El servidor rechazó los datos enviados.',
  401: 'La sesión no es válida. Inicia sesión de nuevo.',
  403: 'No tienes permisos para administrar reportes.',
  404: 'El reporte no existe.',
  409: 'El reporte cambió. Recarga los reportes.',
};

async function request(path, method, body) {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para administrar reportes.');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) throw new Error('Falta configurar la URL del backend.');
  const token = await user.getIdToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/reportes${path}`, {
      method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de reportes.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error?.message || HTTP_MESSAGES[response.status] || 'No se pudo completar la solicitud.');
    throw Object.assign(error, { status: response.status, code: result?.error?.code });
  }
  return result;
}

export function listarReportesAdmin({ cursor } = {}) {
  return request(cursor ? `?cursor=${encodeURIComponent(cursor)}` : '', 'GET');
}

export function cambiarEstadoReporte(reporteId, { estadoNuevo, versionEstadoEsperada }) {
  return request(`/${encodeURIComponent(reporteId)}/estado`, 'PATCH', { estadoNuevo, versionEstadoEsperada });
}
