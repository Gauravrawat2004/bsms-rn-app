
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001';

type BusRow = { bus_no: number; route: string; capacity?: number };
type Plan = { route: string; keep_bus_no: number; suspend_bus_nos: number[]; moved: Array<{ student_id: string; to_bus_no: number; seat: number }>; overflow: Array<{ student_id: string }> };

export default function AdjustOffDay() {
  const router = useRouter();
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);

  const [coursesStr, setCoursesStr] = useState(''); // comma-separated
  const [yearsStr, setYearsStr] = useState('');     // comma-separated
  const [dateStr, setDateStr] = useState('');

  const uniqueRoutes = useMemo(() => Array.from(new Set(buses.map((b) => (b.route || '').toLowerCase()))).filter(Boolean), [buses]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/buses`);
        const j = await r.json();
        setBuses(j);
        setRoutes(uniqueRoutes);
        setSelectedRoutes(uniqueRoutes.slice(0, 1)); // preselect first route
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to load buses');
      }
    })();
  }, []);

  useEffect(() => {
    setRoutes(uniqueRoutes);
  }, [uniqueRoutes]);

  const toggleRoute = (rt: string) => {
    const next = new Set(selectedRoutes);
    next.has(rt) ? next.delete(rt) : next.add(rt);
    setSelectedRoutes(Array.from(next));
  };

  const runAdjustment = async () => {
    const courses = coursesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const years = yearsStr.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    const body = {
      date: dateStr || undefined,
      routes: selectedRoutes,
      off: { courses, years },
      apply: true,
    };

    try {
      const r = await fetch(`${API_BASE}/api/mto/adjust-offday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Adjustment failed');

      const plans = (j.plans ?? []) as Plan[];
      const msg = plans
        .map(
          (p) =>
            `ROUTE ${p.route.toUpperCase()}: keep Bus ${p.keep_bus_no}, suspend ${p.suspend_bus_nos.join(', ') || 'none'}, moved ${p.moved.length}, overflow ${p.overflow.length}`
        )
        .join('\n');

      Alert.alert('Adjustment Applied', msg || 'No changes');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to adjust');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Adjust Buses (Off-Day)" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={20} color="#1f2937" />
              <Text style={styles.cardTitle}>Select Off-Day Filters</Text>
            </View>
          </View>

          {/* Routes multi-select */}
          <Text style={styles.label}>Routes to Consolidate</Text>
          <View style={styles.chipRow}>
            {routes.map((rt) => (
              <TouchableOpacity
                key={rt}
                style={[styles.chip, selectedRoutes.includes(rt) && styles.chipActive]}
                onPress={() => toggleRoute(rt)}
              >
                <Text style={selectedRoutes.includes(rt) ? styles.chipTextActive : styles.chipText}>
                  {rt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Courses & Years */}
          <Text style={styles.label}>Courses OFF (comma separated)</Text>
          <TextInput style={styles.input} placeholder="e.g., BCA, BBA, MBA" value={coursesStr} onChangeText={setCoursesStr} />

          <Text style={styles.label}>Years OFF (comma separated)</Text>
          <TextInput style={styles.input} placeholder="e.g., 1, 2" value={yearsStr} onChangeText={setYearsStr} keyboardType="numeric" />

          <Text style={styles.label}>Date (optional, ISO)</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={dateStr} onChangeText={setDateStr} />

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={runAdjustment}>
            <Ionicons name="shuffle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Run Consolidation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            We’ll keep one bus (largest capacity) per selected route and reassign ON‑day students from other buses
            to the kept bus. OFF‑day students (matching the filters) are excluded from counts.
          </Text>
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

  label: { color: '#374151', fontSize: 13, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#e0ecff', borderColor: '#bfdbfe' },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#0a67d3', fontSize: 12, fontWeight: '700' },

  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },

  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#0a67d3', borderColor: '#0a67d3' },
  btnText: { fontWeight: '600', color: '#fff' },

  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginTop: 4 },
  infoText: { color: '#6b7280', fontSize: 12, flex: 1 },
});
