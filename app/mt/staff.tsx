
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001';

type BusRow = { bus_no: number; route: string; driver?: string; driver_contact?: string; conductor_id?: string; capacity?: number; };

export default function Staff() {
  const router = useRouter();
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [selectedBus, setSelectedBus] = useState<number | null>(null);

  // driver form
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');

  // conductor form
  const [conductorId, setConductorId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/buses`);
        const j = await r.json();
        setBuses(j);
        if (j.length) setSelectedBus(j[0].bus_no);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to load buses');
      }
    })();
  }, []);

  const submitDriver = async () => {
    if (!selectedBus || !driverName.trim()) {
      Alert.alert('Missing data', 'Select bus and enter driver name.');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/mto/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_no: selectedBus, driver_name: driverName.trim(), driver_contact: driverContact.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Update failed');
      Alert.alert('Success', `Driver updated on Bus ${selectedBus}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Driver update failed');
    }
  };

  const submitConductor = async () => {
    if (!selectedBus || !conductorId.trim()) {
      Alert.alert('Missing data', 'Select bus and enter conductor ID.');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/mto/conductor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_no: selectedBus, conductor_id: conductorId.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Update failed');
      Alert.alert('Success', `Conductor updated on Bus ${selectedBus}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Conductor update failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Staff Replacement" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Bus picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Bus</Text>
          <View style={styles.busRow}>
            {buses.map((b) => (
              <TouchableOpacity
                key={b.bus_no}
                style={[styles.busChip, selectedBus === b.bus_no && styles.busChipActive]}
                onPress={() => setSelectedBus(b.bus_no)}
              >
                <Text style={selectedBus === b.bus_no ? styles.busChipTextActive : styles.busChipText}>
                  {`Bus ${b.bus_no}`}{b.route ? ` • ${b.route.toUpperCase()}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Driver replacement */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="person-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Replace Driver</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Driver name"
            value={driverName}
            onChangeText={setDriverName}
          />
          <TextInput
            style={styles.input}
            placeholder="Driver contact (optional)"
            value={driverContact}
            onChangeText={setDriverContact}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={submitDriver}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Update Driver</Text>
          </TouchableOpacity>
        </View>

        {/* Conductor replacement */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="id-card-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Replace Conductor</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Conductor ID"
            value={conductorId}
            onChangeText={setConductorId}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.btn} onPress={submitConductor}>
            <Ionicons name="checkmark-circle" size={18} color="#4f46e5" />
            <Text style={[styles.btnText, { color: '#4f46e5' }]}>Update Conductor</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  content: { padding: 16, paddingBottom: 24 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, backgroundColor: '#f7f7fb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 12, gap: 12 },
  cardHeader: { gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  busRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  busChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  busChipActive: { backgroundColor: '#e0ecff', borderColor: '#bfdbfe' },
  busChipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  busChipTextActive: { color: '#0a67d3', fontSize: 12, fontWeight: '700' },

  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#0a67d3', borderColor: '#0a67d3' },
  btnText: { fontWeight: '600', color: '#fff' },
});
