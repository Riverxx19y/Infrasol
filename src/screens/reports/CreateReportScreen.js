import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { obtenerUbicacionActual } from '../../services/location.service';
import { subirFoto } from '../../services/photo.service';
import { crearReporte } from '../../services/reports.service';
import { buscarReportesCercanos } from '../../services/reportesCercanos.service';
import { apoyarReporte } from '../../services/apoyos.gateway';
import { formatearApoyos, lugarDeReporte, mensajeDeApoyo } from '../../utils/reportFormat';

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
  const [cercanos, setCercanos] = useState([]);
  const [detalleCercano, setDetalleCercano] = useState(null);
  const [supporting, setSupporting] = useState(false);
  const sendingRef = useRef(false);
  const supportingRef = useRef(false);

  async function capturarUbicacion() {
    if (gpsLoading || sendingRef.current || supportingRef.current) return;
    setGpsLoading(true);
    setError('');
    setCercanos([]);
    setDetalleCercano(null);
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

      const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true };
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

  async function apoyarCercano(reporte) {
    if (supportingRef.current) return;
    supportingRef.current = true;
    setSupporting(true);
    setError('');
    setSuccess('');
    try {
      const result = await apoyarReporte(reporte.id);
      setCercanos((items) => items.map((item) => item.id === reporte.id ? { ...item, apoyos: result.apoyos } : item));
      setSuccess(mensajeDeApoyo(result));
    } catch (cause) {
      setError(cause?.message || 'No se pudo comunicar con el servidor de apoyos.');
    } finally {
      supportingRef.current = false;
      setSupporting(false);
    }
  }

  async function enviar(sinFoto = false, continuar = false) {
    if (sendingRef.current || gpsLoading || supportingRef.current) return;
    setSuccess('');
    if (!tipo) { setError('Selecciona un tipo de reporte.'); return; }
    if (!descripcion.trim()) { setError('Escribe una descripción del problema.'); return; }
    if (!ubicacion) { setError('Obtén tu ubicación GPS antes de enviar.'); return; }
    if (!user?.uid) { setError('Debes iniciar sesión para crear un reporte.'); return; }

    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      if (!continuar) {
        setCercanos([]);
        setDetalleCercano(null);
        let encontrados;
        try {
          encontrados = await buscarReportesCercanos({
            tipo, lat: ubicacion.latitude, lng: ubicacion.longitude, uid: user.uid,
          });
        } catch {
          setError('No se pudieron consultar los reportes cercanos. Comprueba la conexión e intenta de nuevo.');
          return;
        }
        setCercanos(encontrados);
        if (encontrados.length) return;
      }
      let fotoUrl = null;
      if (photo?.base64 && !sinFoto) {
        try {
          fotoUrl = await subirFoto(photo.base64);
        } catch (cause) {
          Alert.alert('Error al subir foto', `${cause?.message || 'No se pudo subir la fotografía.'} ¿Enviar el reporte sin foto?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Enviar sin foto', onPress: () => enviar(true, continuar) },
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
      setCercanos([]);
      setDetalleCercano(null);
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
            disabled={sending || gpsLoading || supporting}
            onPress={() => { setTipo(option); setCercanos([]); setDetalleCercano(null); setError(''); }}
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
        value={descripcion} onChangeText={setDescripcion} editable={!sending}
        style={styles.description}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Ubicación GPS *</Text>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Obtener ubicación"
        disabled={gpsLoading || sending} onPress={capturarUbicacion} style={styles.actionButton}
      >
        {gpsLoading ? <ActivityIndicator color="#0057FF" /> : <Text style={styles.actionText}>📍 {ubicacion ? 'Actualizar ubicación' : 'Obtener ubicación'}</Text>}
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
        disabled={sending} onPress={seleccionarFoto} style={styles.actionButton}
      >
        <Text style={styles.actionText}>{photo ? 'Cambiar foto' : 'Agregar foto'}</Text>
      </TouchableOpacity>
      {photo && <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />}

      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View accessibilityRole="alert" style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

      {cercanos.length > 0 && (
        <View style={styles.locationBox}>
          <Text style={styles.label}>Reportes cercanos de la misma categoría</Text>
          {cercanos.map((reporte, index) => (
            <View key={reporte.id} style={styles.nearbyItem}>
              {reporte.usuarioId === user?.uid && <Text>Ya reportaste esta deficiencia</Text>}
              <Text>{reporte.descripcion || reporte.tipo}</Text>
              <Text>{formatearApoyos(reporte.apoyos ?? 0)}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver reporte cercano ${index + 1}`}
                onPress={() => setDetalleCercano(detalleCercano === reporte.id ? null : reporte.id)} style={styles.actionButton}>
                <Text style={styles.actionText}>{detalleCercano === reporte.id ? 'Ocultar detalle' : 'Ver reporte'}</Text>
              </TouchableOpacity>
              {detalleCercano === reporte.id && <Text>{lugarDeReporte(reporte)} · {reporte.estado}</Text>}
              {reporte.usuarioId !== user?.uid && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apoyar reporte cercano"
                  disabled={supporting || sending} onPress={() => apoyarCercano(reporte)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Apoyar reporte existente</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continuar creando reporte"
            disabled={sending || supporting} onPress={() => enviar(false, true)} style={styles.actionButton}>
            <Text style={styles.actionText}>El problema es distinto; crear reporte</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Crear reporte"
        accessibilityState={{ disabled: sending || gpsLoading || supporting }} disabled={sending || gpsLoading || supporting}
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
  actionButton: { backgroundColor: '#FFFFFF', borderColor: '#0057FF', borderWidth: 1, borderRadius: 12, padding: 15, alignItems: 'center' },
  actionText: { color: '#0057FF', fontWeight: '700' },
  locationBox: { backgroundColor: '#E7F6EF', borderRadius: 12, padding: 13, marginTop: 10 },
  locationText: { color: '#14532D', fontWeight: '600' },
  coordinates: { color: '#475569', marginTop: 4 },
  photoPreview: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },
  nearbyItem: { paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderColor: '#CBD5E1' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 18 },
  errorText: { color: '#991B1B' },
  successBox: { backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, marginTop: 18 },
  successText: { color: '#166534' },
  submit: { backgroundColor: '#0057FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
