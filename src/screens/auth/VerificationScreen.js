import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { reenviarCodigo, verificarCodigo } from '../../services/registration.service';
import { useAuthStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';

const emptyDigits = () => Array(6).fill('');

export default function VerificationScreen({ user, otpGateway, onUseAnotherAccount }) {
  const styles = useAuthStyles();
  const { colors } = useTheme();
  const [digits, setDigits] = useState(emptyDigits);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const timer = setTimeout(() => setCooldownUntil(0), Math.max(0, cooldownUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [cooldownUntil]);

  function updateDigit(index, text) {
    const digit = text.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((value, position) => position === index ? digit : value));
  }

  async function handleVerify() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await verificarCodigo(user.uid, digits.join(''), otpGateway);
      // La navegación depende del perfil actualizado por el módulo OTP.
    } catch (cause) {
      setError(cause.message || 'No se pudo verificar el código.');
      setDigits(emptyDigits());
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || Date.now() < cooldownUntil) return;
    setLoading(true);
    setError('');
    try {
      await reenviarCodigo(user.uid, otpGateway);
      setDigits(emptyDigits());
      setCooldownUntil(Date.now() + 60_000);
    } catch (cause) {
      setError(cause.message || 'No se pudo reenviar el código.');
    } finally {
      setLoading(false);
    }
  }

  const resendCoolingDown = Date.now() < cooldownUntil;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.emoji}>✉️</Text>
          <Text accessibilityRole="header" style={styles.title}>Verifica tu cuenta</Text>
          <Text style={styles.subtitle}>
            {otpGateway ? 'Ingresa el código de 6 dígitos cuando llegue a tu correo. Si no lo recibiste, pulsa Reenviar código.' : 'El envío de códigos está pendiente de configuración.'}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.digitRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                accessibilityLabel={`Dígito ${index + 1}`}
                style={[styles.digit, digit && styles.digitFilled]}
                value={digit}
                onChangeText={(text) => updateDigit(index, text)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Verificar código" style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Verificar código</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reenviar código" style={styles.secondaryButton} onPress={handleResend} disabled={loading || resendCoolingDown}>
            <Text style={styles.secondaryText}>{resendCoolingDown ? 'Código enviado (espera 1 min)' : 'Reenviar código'}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>El código expira en 15 minutos. Dispones de 5 intentos.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Usar otra cuenta" onPress={onUseAnotherAccount} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Usar otra cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
