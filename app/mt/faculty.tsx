import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const API_BASE = "https://antonetta-historiographical-vernacularly.ngrok-free.dev";

type Faculty = {
  faculty_id: string;
  name: string;
  phone: string;
  department: string;
};

export default function ManageFaculty() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);

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
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), department: department.trim() }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Create failed');
      Alert.alert('Faculty Created', `ID: ${json.faculty_id}`);
      setName('');
      setPhone('');
      setDepartment('');
      loadFaculties();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create faculty');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Register Faculty</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Department"
            value={department}
            onChangeText={setDepartment}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={submit}
            disabled={creating}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>{creating ? 'Creating…' : 'Create'}</Text>
          </TouchableOpacity>
        </View>

        {faculties.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Existing Faculty</Text>
            {faculties.map((f) => (
              <View key={f.faculty_id} style={styles.row}>
                <Text style={styles.facultyText}>{`${f.faculty_id}: ${f.name} (${f.department})`}</Text>
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
});