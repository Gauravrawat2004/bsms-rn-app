import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../config/api';

type Faculty = {
  faculty_id: string;
  name: string;
  phone: string;
  department: string;
  bus_no?: number | null;
};

type BusRow = {
  bus_no: number;
  route?: string;
};

export default function ManageFaculty() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [busNo, setBusNo] = useState('');
  const [creating, setCreating] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buses, setBuses] = useState<BusRow[]>([]);
  const checklist = [
    { key: 'name', label: 'फैकल्टी का नाम भरें', done: !!name.trim() },
    { key: 'phone', label: 'मोबाइल नंबर भरें', done: !!phone.trim() },
    { key: 'department', label: 'विभाग भरें', done: !!department.trim() },
    { key: 'bus', label: 'बस चुनें या बाद में बदलें', done: !!busNo.trim() },
    { key: 'mode', label: 'अपडेट/डिलीट के लिए नीचे से फैकल्टी चुनें', done: !!editingId },
  ];

  const loadFaculties = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/mto/faculties`);
      const j = await r.json();
      if (r.ok) setFaculties(j);
    } catch (e: any) {
      console.warn('Failed to load faculties:', e);
    }
  };

  useEffect(() => {
    loadFaculties();
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/buses`);
        const j = await r.json();
        if (r.ok) setBuses(j);
      } catch (e: any) {
        console.warn('Failed to load buses:', e);
      }
    })();
  }, []);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !department.trim()) {
      Alert.alert('Missing data', 'Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      const resp = await fetch(`${API_BASE}/api/mto/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          department: department.trim(),
          bus_no: busNo.trim() ? Number(busNo) : undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Create failed');
      Alert.alert('Faculty Created', `ID: ${json.faculty_id}`);
      setName('');
      setPhone('');
      setDepartment('');
      setBusNo('');
      loadFaculties();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create faculty');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (faculty: Faculty) => {
    setEditingId(faculty.faculty_id);
    setName(faculty.name);
    setPhone(faculty.phone);
    setDepartment(faculty.department);
    setBusNo(faculty.bus_no != null ? String(faculty.bus_no) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setDepartment('');
    setBusNo('');
  };

  const updateFaculty = async () => {
    if (!editingId) return;
    try {
      const payload = {
        faculty_id: editingId,
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim(),
        bus_no: busNo.trim() ? Number(busNo) : null,
      };

      const candidates = [
        {
          url: `${API_BASE}/api/mto/faculty/${encodeURIComponent(editingId)}`,
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        {
          url: `${API_BASE}/api/mto/faculty`,
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        {
          url: `${API_BASE}/api/mto/faculty/update`,
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ];

      let updated = false;
      let failure = 'Update failed';

      for (const candidate of candidates) {
        const resp = await fetch(candidate.url, {
          method: candidate.method,
          headers: { 'Content-Type': 'application/json' },
          body: candidate.body,
        });
        const text = await resp.text();
        const json = text ? JSON.parse(text) : {};
        if (resp.ok) {
          updated = true;
          break;
        }
        failure = json?.error || text || failure;
      }

      if (!updated) throw new Error(failure);
      Alert.alert('Faculty Updated', `${editingId} updated successfully.`);
      cancelEdit();
      loadFaculties();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Faculty update is not available on backend yet.');
    }
  };

  const deleteFaculty = async (facultyId: string) => {
    try {
      const candidates = [
        {
          url: `${API_BASE}/api/mto/faculty/${encodeURIComponent(facultyId)}`,
          method: 'DELETE',
          body: undefined,
        },
        {
          url: `${API_BASE}/api/mto/faculty`,
          method: 'DELETE',
          body: JSON.stringify({ faculty_id: facultyId }),
        },
        {
          url: `${API_BASE}/api/mto/faculty/delete`,
          method: 'POST',
          body: JSON.stringify({ faculty_id: facultyId }),
        },
      ];

      let deleted = false;
      let failure = 'Delete failed';

      for (const candidate of candidates) {
        const resp = await fetch(candidate.url, {
          method: candidate.method,
          headers: candidate.body ? { 'Content-Type': 'application/json' } : undefined,
          body: candidate.body,
        });
        const text = await resp.text();
        const json = text ? JSON.parse(text) : {};
        if (resp.ok) {
          deleted = true;
          break;
        }
        failure = json?.error || text || failure;
      }

      if (!deleted) throw new Error(failure);
      Alert.alert('Faculty Deleted', `${facultyId} removed successfully.`);
      if (editingId === facultyId) {
        cancelEdit();
      }
      loadFaculties();
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'Faculty delete is not available on backend yet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Add Faculty</Text>
            <Text style={styles.screenHint}>फैकल्टी जोड़ें, बस असाइन करें, और सूची से कभी भी अपडेट करें।</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>To Do Before Saving</Text>
          {checklist.map((item) => (
            <View key={item.key} style={styles.todoRow}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={item.done ? '#10b981' : '#0a67d3'}
              />
              <Text style={styles.todoText}>{item.label}</Text>
            </View>
          ))}
          <Text style={styles.todoHint}>
            नई फैकल्टी बनाने के लिए नाम, मोबाइल और विभाग जरूरी हैं। बस चयन अभी या बाद में किया जा सकता है।
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{editingId ? `फैकल्टी संपादित करें - ${editingId}` : 'नई फैकल्टी दर्ज करें'}</Text>
          <TextInput
            style={styles.input}
            placeholder="नाम"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="मोबाइल नंबर"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="विभाग"
            value={department}
            onChangeText={setDepartment}
          />
          <Text style={styles.fieldLabel}>बस चुनें</Text>
          <View style={styles.busChipRow}>
            <TouchableOpacity
              style={[styles.busChip, !busNo && styles.busChipActive]}
              onPress={() => setBusNo('')}
            >
              <Text style={!busNo ? styles.busChipTextActive : styles.busChipText}>कोई बस नहीं</Text>
            </TouchableOpacity>
            {buses.map((bus) => (
              <TouchableOpacity
                key={bus.bus_no}
                style={[styles.busChip, busNo === String(bus.bus_no) && styles.busChipActive]}
                onPress={() => setBusNo(String(bus.bus_no))}
              >
                <Text style={busNo === String(bus.bus_no) ? styles.busChipTextActive : styles.busChipText}>
                  {`बस ${bus.bus_no}${bus.route ? ` - ${bus.route}` : ''}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={editingId ? updateFaculty : submit}
            disabled={creating}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>{creating ? 'सेव हो रहा है…' : editingId ? 'अपडेट करें' : 'बनाएँ'}</Text>
          </TouchableOpacity>
          {editingId ? (
            <TouchableOpacity style={styles.btn} onPress={cancelEdit}>
              <Ionicons name="close-circle-outline" size={18} color="#374151" />
              <Text style={[styles.btnText, { color: '#374151' }]}>संपादन रद्द करें</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {faculties.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>फैकल्टी सूची</Text>
            {faculties.map((f) => (
              <View key={f.faculty_id} style={styles.row}>
                <Text style={styles.facultyText}>{`${f.faculty_id}: ${f.name} (${f.department})`}</Text>
                <Text style={styles.facultySubText}>{f.phone}</Text>
                <Text style={styles.facultySubText}>
                  {f.bus_no
                    ? `बस ${f.bus_no}${buses.find((bus) => bus.bus_no === f.bus_no)?.route ? ` - ${buses.find((bus) => bus.bus_no === f.bus_no)?.route}` : ''}`
                    : 'कोई बस असाइन नहीं'}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.smallBtn, styles.editBtn]} onPress={() => startEdit(f)}>
                    <Text style={styles.smallBtnText}>अपडेट</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.deleteBtn]} onPress={() => deleteFaculty(f.faculty_id)}>
                    <Text style={styles.smallBtnText}>डिलीट</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  content: { padding: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  backBtn: { paddingTop: 2 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  screenHint: { marginTop: 4, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#0a67d3', borderColor: '#0a67d3' },
  btnText: { fontWeight: '600', color: '#fff' },
  row: { marginVertical: 6 },
  facultyText: { color: '#374151' },
  facultySubText: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todoText: { flex: 1, color: '#374151' },
  todoHint: { color: '#6b7280', fontSize: 12 },
  busChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  busChip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  busChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  busChipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  busChipTextActive: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editBtn: { backgroundColor: '#dbeafe' },
  deleteBtn: { backgroundColor: '#fee2e2' },
  smallBtnText: { fontWeight: '600', color: '#111827' },
});
