import { Image, Text, View } from 'react-native';
import { styles } from './styles';

export default function AuthHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <Image source={require('../../../assets/icono infrasol.png')} style={styles.logo} resizeMode="cover" />
      </View>
      <Text style={styles.logoText}>INFRASOL</Text>
      <Text style={styles.logoSub}>Infraestructura · Soluciones</Text>
    </View>
  );
}
