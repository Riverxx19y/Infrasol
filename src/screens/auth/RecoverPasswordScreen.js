import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { solicitarRecuperacion } from '../../services/auth.service';
import { validarCorreo } from '../../services/auth.validation';
import AuthHeader from './AuthHeader';
import { colors, styles } from './styles';

const RESEND_WAIT_MS = 60_000;

const recoveryErrors = {
  'auth/invalid-email': 'Ingresa un correo electrónico válido.',
  'auth/missing-email': 'Ingresa tu correo electrónico.',
  'auth/too-many-requests': 'Demasiadas solicitudes. Intenta más tarde.',
  'auth/network-request-failed': 'Sin conexión a internet. Intenta de nuevo.',
};

const GENERIC_ERROR = 'No se pudo enviar la solicitud. Intenta de nuevo.';
const CONFIRMATION = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.';

export default function RecoverPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const timer = setTimeout(() => setCooldownUntil(0), Math.max(0, cooldownUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [cooldownUntil]);

  async function handleSubmit() {
    if (inFlight.current || Date.now() < cooldownUntil) return;
    let cleanEmail;
    try {
      cleanEmail = validarCorreo(email);
    } catch (cause) {
      setSent(false);
      setError(cause.message);
      return;
    }
    inFlight.current = true;
    setLoading(true);
    setError('');
    setSent(false);
    try {
      await solicitarRecuperacion(cleanEmail);
      setSent(true);
      setCooldownUntil(Date.now() + RESEND_WAIT_MS);
    } catch (cause) {
      setError(recoveryErrors[cause?.code] || GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  const coolingDown = Date.now() < cooldownUntil;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>Te enviaremos un enlace para crear una nueva contraseña</Text>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          {sent && <View accessibilityLiveRegion="polite" style={styles.successBox}><Text style={styles.successText}>{CONFIRMATION}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enviar enlace" style={styles.primaryButton} onPress={handleSubmit} disabled={loading || coolingDown}>
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{coolingDown ? 'Enlace enviado (espera 1 min)' : 'Enviar enlace →'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a iniciar sesión" style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryText}>Volver a iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
