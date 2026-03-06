import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

/** * Ensure this matches your ngrok URL exactly.
 * IMPORTANT: No trailing slash at the end!
 */
const API_BASE = "https://antonetta-historiographical-vernacularly.ngrok-free.dev";

export default function DataCsv() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const uploadCsvTo = async (endpoint: '/upload/bus' | '/upload/student') => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (pick.canceled || !pick.assets?.length) return;

      const file = pick.assets[0];
      
      // Strict extension check
      if (!file.name?.toLowerCase().endsWith('.csv')) {
        Alert.alert('Invalid file', 'Please select a CSV file.');
        return;
      }

      setUploading(true);

      const form = new FormData();
      
      if (Platform.OS === 'web') {
        /**
         * WEB FIX: 
         * expo-document-picker on web returns a File object in 'file.file'.
         * We append that raw object directly.
         */
        const fileToAppend = (file as any).file || file; 
        form.append("file", fileToAppend);
      } else {
        /**
         * MOBILE FIX: 
         * standard React Native FormData structure.
         */
        form.append('file', {
          uri: file.uri,
          name: file.name || 'upload.csv',
          type: file.mimeType || 'text/csv',
        } as any);
      }

      console.log(`Uploading to: ${API_BASE}${endpoint}`);

      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: form,
        headers: {
          'Accept': 'application/json',
          // Bypass ngrok warning page
          'ngrok-skip-browser-warning': 'true', 
          /** * DO NOT set 'Content-Type' manually. 
           * The browser (Web) or RN (Mobile) will set it with the correct boundary.
           */
        },
      });

      // 1. Check if response is actually JSON
      const contentType = resp.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await resp.text();
        console.error('Server returned non-JSON:', textError);
        throw new Error(`Server error: Expected JSON but received ${contentType || 'text'}`);
      }

      const json = await resp.json();

      // 2. Handle Logic Errors from Backend
      if (!resp.ok) {
        throw new Error(json?.error || `Upload failed: ${resp.status}`);
      }

      // 3. Success
      Alert.alert(
        'Success',
        endpoint === '/upload/bus'
          ? `Bus CSV processed. ${json?.count ?? 0} buses updated.`
          : `Student CSV processed. ${json?.added ?? 0} new student(s) added.`
      );
    } catch (e: any) {
      console.error('Upload error detail:', e);
      Alert.alert('Upload error', e?.message ?? 'Failed to upload CSV.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Data / CSV" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* BUS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Upload Bus CSV</Text>
            </View>
            <Text style={styles.cardHint}>Fields: bus_no, vehicle_no, driver, route, capacity…</Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            disabled={uploading}
            onPress={() => uploadCsvTo('/upload/bus')}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#ffffff" />
            <Text style={styles.btnText}>{uploading ? 'Uploading…' : 'Upload Bus CSV'}</Text>
          </TouchableOpacity>
        </View>

        {/* STUDENT CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Upload Student CSV</Text>
            </View>
            <Text style={styles.cardHint}>Fields: student_id, name, course, year, route, fee_paid…</Text>
          </View>

          <TouchableOpacity
            style={styles.btn}
            disabled={uploading}
            onPress={() => uploadCsvTo('/upload/student')}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#4f46e5" />
            <Text style={[styles.btnText, { color: '#4f46e5' }]}>
              {uploading ? 'Uploading…' : 'Upload Student CSV'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, backgroundColor: '#f7f7fb',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },
  cardHeader: { gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardHint: { fontSize: 12, color: '#6b7280' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  btnPrimary: { backgroundColor: '#0a67d3', borderColor: '#0a67d3' },
  btnText: { fontWeight: '600', color: '#ffffff' },
});