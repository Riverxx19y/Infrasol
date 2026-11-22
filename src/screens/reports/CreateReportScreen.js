import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { obtenerUbicacionActual } from '../../services/location.service';
import { subirFoto } from '../../services/photo.service';
import { crearReporte } from '../../services/reports.service';

const TIPOS = ['Alumbrado', 'Vías', 'Alcantarillado', 'Basuras', 'Zonas verdes', 'Otro'];

export default function CreateReportScreen({ user, onBack, onCreated }) {
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const sendingRef = useRef(false);

  async function capturarUbicacion() {
    if (gpsLoading || sendingRef.current) return;
    setGpsLoading(true);
    setError('');
    try {
      setUbicacion(await obtenerUbicacionActual());
    } catch (cause) {
      setUbicacion(null);
      setError(cause?.message || 'No se pudo obtener la ubicación.');
    } finally {
      setGpsLoading(false);
    }
  }

  function seleccionarFoto() {
    if (sendingRef.current) return;
    Alert.alert('Agregar foto', '¿Cómo quieres agregar la foto?', [
      { text: 'Cámara', onPress: () => abrirFuente('camera') },
      { text: 'Galería', onPress: () => abrirFuente('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function abrirFuente(source) {
    if (sendingRef.current) return;
    setError('');
    const isCamera = source === 'camera';
    try {
      const permission = isCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setError(`Permiso de ${isCamera ? 'cámara' : 'galería'} denegado. Puedes enviar el reporte sin foto.`);
        return;
      }

      const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true };
      const result = isCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (typeof asset?.uri !== 'string' || typeof asset?.base64 !== 'string' || !asset.base64) {
        setError('No se pudo preparar la fotografía. Puedes enviar el reporte sin foto.');
        return;
      }
      setPhoto({ uri: asset.uri, base64: asset.base64 });
    } catch {
      setError('No se pudo seleccionar la fotografía. Puedes enviar el reporte sin foto.');
    }
  }

  async function enviar(sinFoto = false) {
    if (sendingRef.current) return;
    setSuccess('');
    if (!tipo) { setError('Selecciona un tipo de reporte.'); return; }
    if (!descripcion.trim()) { setError('Escribe una descripción del problema.'); return; }
    if (!ubicacion) { setError('Obtén tu ubicación GPS antes de enviar.'); return; }
    if (!user?.uid) { setError('Debes iniciar sesión para crear un reporte.'); return; }

    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      let fotoUrl = null;
      if (photo?.base64 && !sinFoto) {
        try {
          fotoUrl = await subirFoto(photo.base64);
        } catch (cause) {
          Alert.alert('Error al subir foto', `${cause?.message || 'No se pudo subir la fotografía.'} ¿Enviar el reporte sin foto?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Enviar sin foto', onPress: () => enviar(true) },
          ]);
          return;
        }
      }
      const id = await crearReporte({
        tipo, descripcion: descripcion.trim(),
        lat: ubicacion.latitude, lng: ubicacion.longitude,
        direccion: ubicacion.direccion,
        fotoUrl,
      });
      setSuccess('Reporte creado exitosamente.');
      onCreated?.(id);
    } catch (cause) {
      setError(cause?.message || 'No se pudo crear el reporte. Intenta de nuevo.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {onBack && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      )}
      <Text accessibilityRole="header" style={styles.title}>Nuevo reporte</Text>
      <Text style={styles.subtitle}>Cuéntanos qué problema de infraestructura encontraste.</Text>

      <Text style={styles.label}>Tipo de reporte *</Text>
      <View style={styles.types}>
        {TIPOS.map((option) => (
          <TouchableOpacity
            key={option} accessibilityRole="button" accessibilityLabel={option}
            accessibilityState={{ selected: tipo === option }}
            onPress={() => { setTipo(option); setError(''); }}
            style={[styles.type, tipo === option && styles.typeSelected]}
          >
            <Text style={[styles.typeText, tipo === option && styles.typeTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Descripción *</Text>
      <TextInput
        accessibilityLabel="Descripción" multiline
        placeholder="Describe el problema y una referencia útil"
        value={descripcion} onChangeText={setDescripcion}
        style={styles.description}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Ubicación GPS *</Text>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Obtener ubicación"
        disabled={gpsLoading || sending} onPress={capturarUbicacion} style={styles.gpsButton}
      >
        {gpsLoading ? <ActivityIndicator color="#0057FF" /> : <Text style={styles.gpsText}>📍 {ubicacion ? 'Actualizar ubicación' : 'Obtener ubicación'}</Text>}
      </TouchableOpacity>
      {ubicacion && (
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>{ubicacion.direccion || 'Ubicación capturada'}</Text>
          <Text style={styles.coordinates}>{ubicacion.latitude}, {ubicacion.longitude}</Text>
        </View>
      )}

      <Text style={styles.label}>Fotografía (opcional)</Text>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Agregar foto"
        disabled={sending} onPress={seleccionarFoto} style={styles.photoButton}
      >
        <Text style={styles.photoButtonText}>{photo ? 'Cambiar foto' : 'Agregar foto'}</Text>
      </TouchableOpacity>
      {photo && <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />}

      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View accessibilityRole="alert" style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Crear reporte"
        accessibilityState={{ disabled: sending }} disabled={sending}
        onPress={() => enviar()} style={[styles.submit, sending && styles.submitDisabled]}
      >
        {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Crear reporte</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 24, paddingTop: 52, paddingBottom: 48 },
  back: { marginBottom: 18, alignSelf: 'flex-start' },
  backText: { color: '#0057FF', fontSize: 16, fontWeight: '600' },
  title: { color: '#0F172A', fontSize: 30, fontWeight: '700' },
  subtitle: { color: '#475569', fontSize: 15, marginTop: 6, marginBottom: 24 },
  label: { color: '#0F172A', fontWeight: '700', fontSize: 15, marginTop: 20, marginBottom: 9 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  type: { borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  typeSelected: { borderColor: '#0057FF', backgroundColor: '#DBEAFE' },
  typeText: { color: '#334155', fontWeight: '600' },
  typeTextSelected: { color: '#0044CC' },
  description: { minHeight: 112, padding: 14, backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 12, fontSize: 15 },
  gpsButton: { backgroundColor: '#FFFFFF', borderColor: '#0057FF', borderWidth: 1, borderRadius: 12, padding: 15, alignItems: 'center' },
  gpsText: { color: '#0057FF', fontWeight: '700' },
  locationBox: { backgroundColor: '#E7F6EF', borderRadius: 12, padding: 13, marginTop: 10 },
  locationText: { color: '#14532D', fontWeight: '600' },
  coordinates: { color: '#475569', marginTop: 4 },
  photoButton: { backgroundColor: '#FFFFFF', borderColor: '#0057FF', borderWidth: 1, borderRadius: 12, padding: 15, alignItems: 'center' },
  photoButtonText: { color: '#0057FF', fontWeight: '700' },
  photoPreview: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 18 },
  errorText: { color: '#991B1B' },
  successBox: { backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, marginTop: 18 },
  successText: { color: '#166534' },
  submit: { backgroundColor: '#0057FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
