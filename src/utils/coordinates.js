export function coordenadasValidas(latitude, longitude) {
  return typeof latitude === 'number' && Number.isFinite(latitude)
    && latitude >= -90 && latitude <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude)
    && longitude >= -180 && longitude <= 180;
}
