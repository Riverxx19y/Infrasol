import Supercluster from 'supercluster';
import { coordenadasValidas } from './coordinates';

const CATEGORIES = {
  Alumbrado: { color: '#D97706', symbol: '💡' },
  'Vías': { color: '#475569', symbol: '🚧' },
  Alcantarillado: { color: '#2563EB', symbol: '💧' },
  Basuras: { color: '#15803D', symbol: '🗑️' },
  'Zonas verdes': { color: '#16A34A', symbol: '🌳' },
  Otro: { color: '#7E22CE', symbol: '🔧' },
};

const PRIORITIES = { Alta: '#DC2626', Media: '#CA8A04', Baja: '#16A34A' };
const NEUTRAL = '#64748B';

export function crearMarcadores(reports = []) {
  return reports
    .filter((report) => report.estado !== 'Resuelto' && coordenadasValidas(report.lat, report.lng))
    .map((report) => {
      const category = CATEGORIES[report.tipo] || CATEGORIES.Otro;
      const priority = Object.prototype.hasOwnProperty.call(PRIORITIES, report.prioridad) ? report.prioridad : null;
      return {
        ...report,
        estilo: {
          categoria: category.color,
          simbolo: category.symbol,
          prioridad: priority,
          colorPrioridad: priority ? PRIORITIES[priority] : NEUTRAL,
        },
      };
    });
}

export function agruparMarcadores(markers, zoom, bounds = [-180, -90, 180, 90]) {
  if (!markers.length) return [];
  const features = markers.map((marker) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [marker.lng, marker.lat] },
    properties: { id: marker.id },
  }));
  const index = new Supercluster({ radius: 60, maxZoom: 20 });
  index.load(features);
  return index.getClusters(bounds, Math.max(0, Math.min(21, Math.floor(zoom)))).map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    if (feature.properties.cluster) {
      return {
        id: `cluster-${feature.properties.cluster_id}`,
        isCluster: true,
        clusterId: feature.properties.cluster_id,
        count: feature.properties.point_count,
        lat, lng,
        expansionZoom: index.getClusterExpansionZoom(feature.properties.cluster_id),
      };
    }
    const marker = markers.find((item) => item.id === feature.properties.id);
    return { ...marker, isCluster: false, count: 1 };
  });
}
