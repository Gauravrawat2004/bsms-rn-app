// app/mto/data.tsx
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE = "http://192.168.1.101:3001";

export default function DataCsv() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const uploadCsvTo = async (endpoint: '/upload/bus' | '/upload/student') => {
      try {
    const pick = await DocumentPicker.getDocumentAsync({
      type: "text/csv",
      copyToCacheDirectory: true,
    });

    if (pick.canceled || !pick?.assets?.length) return;

    const file = pick.assets[0];

    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name || "upload.csv",
      type: "text/csv",  // ← FIXES BOUNDARY ISSUE
    } as any);

    // 🔥 IMPORTANT: DO NOT SET HEADERS
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body: form,
    });

    const json = await resp.json();

    Alert.alert("Success", "CSV uploaded successfully!");
  } catch (e: any) {
    console.log(e);
    Alert.alert("Upload failed", e?.message || "Network request failed");
  }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Data / CSV" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* BUS CSV UPLOAD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Upload Bus CSV</Text>
            </View>
            <Text style={styles.cardHint}>Format: bus_no, vehicle_no, driver, route, capacity…</Text>
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

        {/* STUDENT CSV UPLOAD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Upload Student CSV</Text>
            </View>
            <Text style={styles.cardHint}>Format: student_id, name, course, year, route, fee_paid…</Text>
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
      <Ionicons name="arrow-back" size={22} color="#374151" onPress={onBack} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

/* ---- Styles ---- */
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
