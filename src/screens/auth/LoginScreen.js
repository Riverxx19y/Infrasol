import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { iniciarSesion } from '../../services/auth.service';
import { validarCredenciales } from '../../services/auth.validation';
import { loginErrors, mensajeErrorAuth } from '../../services/auth.errors';
import AuthHeader from './AuthHeader';
import { colors, styles } from './styles';

export default function LoginScreen({ onLogin, onRegister, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (loading) return;
    let cleanEmail;
    try {
      cleanEmail = validarCredenciales(email, password);
    } catch (cause) {
      setError(cause.message);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await iniciarSesion(cleanEmail, password);
      onLogin?.(user);
    } catch (cause) {
      setError(mensajeErrorAuth(cause, loginErrors, cause?.message || 'No se pudo iniciar sesión. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput accessibilityLabel="Contraseña" style={styles.input} placeholder="Tu contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Olvidé mi contraseña" style={styles.linkButton} onPress={onForgotPassword} disabled={loading}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
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
