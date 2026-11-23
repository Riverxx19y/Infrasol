import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function bubbleSize(count, isCluster) {
  if (!isCluster) return 48;
  if (count < 10) return 44;
  if (count < 100) return 52;
  return 60;
}

export default function ReportBubble({ group, size, onPress, x, y }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={group.isCluster ? `Clúster de ${group.count} reportes` : `Reporte: ${group.tipo}`}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.bubble, { left: x - size / 2, top: y - size / 2, width: size, height: size }]}
    >
      {group.isCluster ? (
        <>
          <View style={[styles.halo, { borderRadius: (size + 16) / 2 }]} />
          <View style={[styles.clusterOuter, { borderRadius: size / 2 }]}>
            <View style={[styles.clusterInner, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]}>
              <Text style={styles.clusterText}>{group.count}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={[styles.pinOuter, { backgroundColor: group.estilo.colorPrioridad }]}>
          <View style={[styles.pinInner, { backgroundColor: group.estilo.categoria }]}>
            <Text style={styles.pinSymbol}>{group.estilo.simbolo}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    backgroundColor: 'rgba(0, 87, 255, 0.22)',
  },
  clusterOuter: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', elevation: 4,
  },
  clusterInner: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0057FF' },
  clusterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pinOuter: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  pinInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pinSymbol: { fontSize: 18, textAlign: 'center' },
});
