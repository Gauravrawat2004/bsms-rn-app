import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
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

type Student = {
  student_id: string;
  name: string;
  course?: string;
  year?: string;
  route?: string;
  bus_no?: number;
};

export default function DataManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'manual'>('pending');
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Manual entry form
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    course: '',
    year: '',
    route: '',
  });

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

  const addManualStudent = async () => {
    if (!formData.student_id.trim() || !formData.name.trim()) {
      Alert.alert('Missing data', 'Student ID and Name are required');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/admin/add-student-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to add student');
      }

      Alert.alert('Success', 'Student added successfully');
      setFormData({ student_id: '', name: '', course: '', year: '', route: '' });
      setManualMode(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add student');
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
          style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
            Manual Entry
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
          {!manualMode ? (
            <>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color="#0a67d3" />
                <Text style={styles.infoText}>
                  Use this form to manually add students for urgent cases.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { marginBottom: 20 }]}
                onPress={() => setManualMode(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.btnText}>Add New Student</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Student Manually</Text>

              <Text style={styles.fieldLabel}>Student ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ST001"
                value={formData.student_id}
                onChangeText={(text) => setFormData({ ...formData, student_id: text })}
              />

              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.fieldLabel}>Course</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., B.Tech"
                value={formData.course}
                onChangeText={(text) => setFormData({ ...formData, course: text })}
              />

              <Text style={styles.fieldLabel}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1"
                value={formData.year}
                onChangeText={(text) => setFormData({ ...formData, year: text })}
              />

              <Text style={styles.fieldLabel}>Route</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Bhimtal"
                value={formData.route}
                onChangeText={(text) => setFormData({ ...formData, route: text })}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setManualMode(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={addManualStudent}
                >
                  <Text style={styles.btnText}>Add Student</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  fieldValue: { fontSize: 13, color: '#111827', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  btnPrimary: { backgroundColor: '#0a67d3', flex: 1, justifyContent: 'center' },
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
