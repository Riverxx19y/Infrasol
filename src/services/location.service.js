import * as Location from 'expo-location';

export function coordenadasValidas(latitude, longitude) {
  return typeof latitude === 'number' && Number.isFinite(latitude)
    && latitude >= -90 && latitude <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude)
    && longitude >= -180 && longitude <= 180;
}

export async function obtenerUbicacionActual() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Permiso de ubicación denegado. Actívalo en Configuración.');
  }

  let position;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    throw new Error('No se pudo obtener la ubicación GPS. Intenta de nuevo.');
  }

  const { latitude, longitude } = position?.coords ?? {};
  if (!coordenadasValidas(latitude, longitude)) {
    throw new Error('El GPS devolvió coordenadas inválidas.');
  }

  const result = { latitude, longitude };
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (address) {
      const direccion = [address.street, address.district, address.city].filter(Boolean).join(', ');
      if (direccion) result.direccion = direccion;
    }
  } catch {
    // La dirección es opcional; las coordenadas siguen siendo utilizables.
  }
  return result;
}
