import { StatusBar, StyleSheet, Text, View } from 'react-native';

export default function StartScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <Text accessibilityRole="header" style={styles.title}>INFRASOL</Text>
      <Text style={styles.message}>Sprint 0 · Expo SDK 54 en marcha</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F1F5F9',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: '#334155',
    fontSize: 16,
    textAlign: 'center',
  },
});
