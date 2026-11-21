import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { registrarCiudadano } from '../../services/registration.service';
import { colors, styles } from './styles';

export default function RegisterScreen({ otpGateway, onRegistered, onLogin }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const user = await registrarCiudadano({ nombre, email, password }, otpGateway);
      onRegistered?.(user);
    } catch (cause) {
      setError(cause.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={require('../../../assets/icono infrasol.png')} style={styles.logo} resizeMode="cover" />
          </View>
          <Text style={styles.logoText}>INFRASOL</Text>
          <Text style={styles.logoSub}>Infraestructura · Soluciones</Text>
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete a la comunidad INFRASOL</Text>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput accessibilityLabel="Nombre completo" style={styles.input} placeholder="Juan Pérez" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput accessibilityLabel="Contraseña" style={styles.input} placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear cuenta" style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Crear cuenta →</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Iniciar sesión" style={styles.secondaryButton} onPress={onLogin} disabled={loading}>
            <Text style={styles.secondaryText}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
