const VIEWPORT_PADDING = 0.5;

export function viewport(region) {
  const padLng = region.longitudeDelta * VIEWPORT_PADDING;
  const padLat = region.latitudeDelta * VIEWPORT_PADDING;
  return [
    Math.max(-180, region.longitude - region.longitudeDelta / 2 - padLng),
    Math.max(-90, region.latitude - region.latitudeDelta / 2 - padLat),
    Math.min(180, region.longitude + region.longitudeDelta / 2 + padLng),
    Math.min(90, region.latitude + region.latitudeDelta / 2 + padLat),
  ];
}

export function mapZoom(region) {
  return Math.max(0, Math.min(21, Math.round(Math.log2(360 / region.longitudeDelta))));
}

const mercatorY = (latitude) => Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));

export function project(latitude, longitude, region, size) {
  const west = region.longitude - region.longitudeDelta / 2;
  const top = mercatorY(region.latitude + region.latitudeDelta / 2);
  const bottom = mercatorY(region.latitude - region.latitudeDelta / 2);
  return {
    x: ((longitude - west) / region.longitudeDelta) * size.width,
    y: ((top - mercatorY(latitude)) / (top - bottom)) * size.height,
  };
}
