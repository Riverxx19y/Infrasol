import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { solicitarRecuperacion } from '../../services/auth.service';
import { validarCorreo } from '../../services/auth.validation';
import { mensajeErrorAuth, RECOVERY_GENERIC_ERROR, recoveryErrors } from '../../services/auth.errors';
import { useCooldown } from '../../hooks/useCooldown';
import AuthHeader from './AuthHeader';
import { useAuthStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';

const RESEND_WAIT_MS = 60_000;
const CONFIRMATION = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.';

export default function RecoverPasswordScreen({ onBack }) {
  const styles = useAuthStyles();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const cooldown = useCooldown(RESEND_WAIT_MS);
  const inFlight = useRef(false);

  async function handleSubmit() {
    if (inFlight.current || cooldown.active) return;
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
      cooldown.start();
    } catch (cause) {
      setError(mensajeErrorAuth(cause, recoveryErrors, RECOVERY_GENERIC_ERROR));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>Te enviaremos un enlace para crear una nueva contraseña</Text>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} placeholderTextColor={colors.mutedText} placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          {sent && <View accessibilityLiveRegion="polite" style={styles.successBox}><Text style={styles.successText}>{CONFIRMATION}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enviar enlace" style={styles.primaryButton} onPress={handleSubmit} disabled={loading || cooldown.active}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>{cooldown.active ? 'Enlace enviado (espera 1 min)' : 'Enviar enlace →'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a iniciar sesión" style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryText}>Volver a iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
