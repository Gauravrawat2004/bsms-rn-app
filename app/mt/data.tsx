import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../config/api';

type PendingStudent = {
  id: string;
  student_id: string;
  name: string;
  course?: string;
  year?: string;
  route?: string;
  submitted_at?: string;
};

export default function DataManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'csv' | 'pending'>('csv');
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [uploadingBus, setUploadingBus] = useState(false);
  const [uploadingStudents, setUploadingStudents] = useState(false);

  const loadPendingStudents = async () => {
    setLoadingPending(true);
    try {
      const resp = await fetch(`${API_BASE}/api/admin/pending-students`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: PendingStudent[] = await resp.json();
      setPendingStudents(data);
    } catch (e: any) {
      console.warn('Failed to load pending students:', e?.message);
      Alert.alert('Error', 'Failed to load pending submissions');
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingStudents();
      const refreshInterval = setInterval(loadPendingStudents, 10000); // Refresh every 10s
      return () => clearInterval(refreshInterval);
    }
  }, [activeTab]);

  const approveStudent = async (pendingId: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/approve-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_id: pendingId }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to approve');
      }

      Alert.alert('Success', 'Student approved');
      loadPendingStudents();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve');
    }
  };

  const rejectStudent = async (pendingId: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/reject-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_id: pendingId }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to reject');
      }

      Alert.alert('Success', 'Student rejected');
      loadPendingStudents();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject');
    }
  };

  const uploadCsv = async (kind: 'bus' | 'student') => {
    const setUploading = kind === 'bus' ? setUploadingBus : setUploadingStudents;
    const label = kind === 'bus' ? 'Bus' : 'Student';

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file?.uri) {
        Alert.alert('Upload error', 'No CSV file selected.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || `${kind}.csv`,
        type: file.mimeType || 'text/csv',
      } as any);

      const resp = await fetch(`${API_BASE}/api/upload/${kind}`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });
      const text = await resp.text();
      const data = text ? JSON.parse(text) : {};

      if (!resp.ok) {
        throw new Error(data?.error || `${label} CSV upload failed`);
      }

      const count = data?.count ?? data?.added;
      Alert.alert('Upload complete', `${label} CSV uploaded successfully${count != null ? ` (${count} records)` : ''}.`);
    } catch (e: any) {
      console.warn(`${label} CSV upload failed:`, e?.message);
      Alert.alert('Upload error', e?.message || `${label} CSV upload failed.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Data Management" onBack={() => router.back()} />
      
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending Approvals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'csv' && styles.tabActive]}
          onPress={() => setActiveTab('csv')}
        >
          <Text style={[styles.tabText, activeTab === 'csv' && styles.tabTextActive]}>
            CSV Upload
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'pending' ? (
        <View style={{ flex: 1 }}>
          {loadingPending ? (
            <View style={styles.center}>
              <Text style={styles.muted}>Loading submissions…</Text>
            </View>
          ) : pendingStudents.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
              <Text style={styles.emptyText}>All submissions reviewed!</Text>
            </View>
          ) : (
            <FlatList
              data={pendingStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Student ID</Text>
                      <Text style={styles.fieldValue}>{item.student_id}</Text>

                      <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Name</Text>
                      <Text style={styles.fieldValue}>{item.name}</Text>

                      {item.course && (
                        <>
                          <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Course</Text>
                          <Text style={styles.fieldValue}>{item.course}</Text>
                        </>
                      )}

                      {item.route && (
                        <>
                          <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Route</Text>
                          <Text style={styles.fieldValue}>{item.route}</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnApprove]}
                      onPress={() => approveStudent(item.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                      <Text style={[styles.btnText, { color: '#ffffff' }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReject]}
                      onPress={() => rejectStudent(item.id)}
                    >
                      <Ionicons name="close" size={16} color="#ffffff" />
                      <Text style={[styles.btnText, { color: '#ffffff' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#0a67d3" />
            <Text style={styles.infoText}>
              Upload bus CSV first, then upload student CSV so routes, assignments, and seats can be generated correctly.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.uploadHeader}>
              <Ionicons name="bus-outline" size={24} color="#0a67d3" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Bus CSV</Text>
                <Text style={styles.fieldValue}>Expected columns include Bus No, Vehicle No, Driver, Helper, Route, Capacity, Conductor ID.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, uploadingBus && styles.btnDisabled]}
              onPress={() => uploadCsv('bus')}
              disabled={uploadingBus}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
              <Text style={styles.btnText}>{uploadingBus ? 'Uploading Bus CSV...' : 'Upload Bus CSV'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.uploadHeader}>
              <Ionicons name="people-outline" size={24} color="#0a67d3" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Student CSV</Text>
                <Text style={styles.fieldValue}>Expected columns include Student ID, Name, Course, Year, Route, and Fee Paid.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, uploadingStudents && styles.btnDisabled]}
              onPress={() => uploadCsv('student')}
              disabled={uploadingStudents}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
              <Text style={styles.btnText}>{uploadingStudents ? 'Uploading Student CSV...' : 'Upload Student CSV'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    paddingHorizontal: 12, backgroundColor: '#f7f7fb', borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0a67d3' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#0a67d3' },

  listContent: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6b7280' },
  emptyText: { color: '#10b981', fontSize: 16, fontWeight: '600', marginTop: 8 },

  infoCard: {
    backgroundColor: '#dbeafe', borderRadius: 12, padding: 12, marginBottom: 16,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#0369a1', fontWeight: '500' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1,
    borderColor: '#e5e7eb', padding: 16, marginBottom: 12, gap: 12,
  },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  uploadHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  fieldValue: { fontSize: 13, color: '#111827', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  btnPrimary: { backgroundColor: '#0a67d3', flex: 1, justifyContent: 'center' },
  btnDisabled: { opacity: 0.65 },
  btnApprove: { backgroundColor: '#10b981', flex: 1, justifyContent: 'center' },
  btnReject: { backgroundColor: '#ef4444', flex: 1, justifyContent: 'center' },
  btnCancel: { backgroundColor: '#e5e7eb', flex: 1, justifyContent: 'center' },
  btnText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
    fontSize: 13, marginBottom: 12,
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
