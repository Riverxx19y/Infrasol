import { coordenadasValidas } from './coordinates';

const EARTH_RADIUS_METERS = 6371000;

export function distanciaMetros(lat1, lng1, lat2, lng2) {
  if (!coordenadasValidas(lat1, lng1) || !coordenadasValidas(lat2, lng2)) return NaN;
  const radians = Math.PI / 180;
  const deltaLat = (lat2 - lat1) * radians;
  const deltaLng = (lng2 - lng1) * radians;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function esCandidatoCercano(reporte, { tipo, lat, lng, uid } = {}) {
  return reporte?.estado === 'Pendiente'
    && reporte.tipo === tipo
    && reporte.usuarioId !== uid
    && coordenadasValidas(lat, lng)
    && coordenadasValidas(reporte.lat, reporte.lng)
    && distanciaMetros(lat, lng, reporte.lat, reporte.lng) <= 150;
}
