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
import { API_BASE } from '../config/api';

export default function DataCsv() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const normalizeBase = API_BASE.replace(/\/+$/, '');

  const buildFormData = (file: DocumentPicker.DocumentPickerAsset) => {
    const form = new FormData();

    if (Platform.OS === 'web') {
      const fileToAppend = (file as any).file || file;
      form.append('file', fileToAppend);
      return form;
    }

    form.append('file', {
      uri: file.uri,
      name: file.name || 'upload.csv',
      type: file.mimeType || 'text/csv',
    } as any);
    return form;
  };

  const parseUploadResponse = async (resp: Response) => {
    const contentType = resp.headers.get('content-type') || '';
    const bodyText = await resp.text();

    if (contentType.includes('application/json')) {
      try {
        return {
          json: bodyText ? JSON.parse(bodyText) : null,
          text: bodyText,
        };
      } catch {
        throw new Error('Server returned invalid JSON.');
      }
    }

    return { json: null, text: bodyText };
  };

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

      const uploadPaths = Array.from(new Set([
        `/api${endpoint}` as const,
        endpoint,
      ]));

      let uploadResult: any = null;
      let lastError: Error | null = null;
      const attemptedUrls: string[] = [];

      for (const path of uploadPaths) {
        try {
          const url = `${normalizeBase}${path}`;
          attemptedUrls.push(url);
          const resp = await fetch(url, {
            method: 'POST',
            body: buildFormData(file),
            headers: {
              Accept: 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
          });

          const { json, text } = await parseUploadResponse(resp);

          if (!resp.ok) {
            throw new Error(
              json?.error ||
                text?.trim() ||
                `Upload failed: ${resp.status}`
            );
          }

          if (!json) {
            throw new Error(text?.trim() || 'Server returned an empty response.');
          }

          uploadResult = json;
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error instanceof Error ? error : new Error('Upload failed.');
        }
      }

      if (lastError || !uploadResult) {
        throw new Error(
          `${lastError?.message || 'Failed to upload CSV.'}\nTried: ${attemptedUrls.join(', ')}`
        );
      }

      Alert.alert(
        'Success',
        endpoint === '/upload/bus'
          ? `Bus CSV processed. ${uploadResult?.count ?? 0} buses updated.`
          : `Student CSV processed. ${uploadResult?.added ?? 0} new student(s) added.`
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
