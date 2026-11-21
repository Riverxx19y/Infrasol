import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { iniciarSesion } from '../../services/auth.service';
import { colors, styles } from './styles';

const authErrors = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Ingresa un correo electrónico válido.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/network-request-failed': 'Sin conexión a internet. Intenta de nuevo.',
};

export default function LoginScreen({ onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError('Completa el correo y la contraseña.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await iniciarSesion(cleanEmail, password);
      onLogin?.(user);
    } catch (cause) {
      setError(authErrors[cause?.code] || cause?.message || 'No se pudo iniciar sesión. Intenta de nuevo.');
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
          <Text accessibilityRole="header" style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput accessibilityLabel="Contraseña" style={styles.input} placeholder="Tu contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Entrar" style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Entrar →</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear cuenta" style={styles.secondaryButton} onPress={onRegister} disabled={loading}>
            <Text style={styles.secondaryText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
