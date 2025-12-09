
// app/mto/live.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001';

type SummaryItem = {
  bus_no: number;
  capacity: number;
  occupied: number;
  present_today: number;
  route: string;
};

export default function LiveStatus() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState<SummaryItem[]>([]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/incharge/summary`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: SummaryItem[] = await resp.json();
      setFleet(json);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load fleet summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalCapacity = useMemo(
    () => fleet.reduce((acc, b) => acc + (b.capacity ?? 0), 0),
    [fleet]
  );
  const totalOccupied = useMemo(
    () => fleet.reduce((acc, b) => acc + (b.occupied ?? 0), 0),
    [fleet]
  );
  const occupancyPct = useMemo(() => {
    if (!totalCapacity) return 0;
    return Math.round((totalOccupied / totalCapacity) * 100);
  }, [totalCapacity, totalOccupied]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Live Status" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Loading fleet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Live Status" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview stats */}
        <View style={styles.statBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Active Buses</Text>
            <Text style={styles.statValue}>{fleet.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Occupancy</Text>
            <Text style={styles.statValue}>{occupancyPct}%</Text>
          </View>
        </View>

        {/* Bus cards */}
        {fleet.map((bus) => {
          const pct = bus.capacity
            ? Math.min(100, Math.round((bus.occupied / bus.capacity) * 100))
            : 0;
          const isFull = bus.occupied >= bus.capacity;
          const barColor = isFull ? '#ef4444' : '#2563eb';

          return (
            <View key={bus.bus_no} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="bus-outline" size={20} color="#1f2937" />
                  <Text style={styles.cardTitle}>{`Bus ${bus.bus_no}`}</Text>
                </View>
                <Text style={styles.route}>{bus.route?.toUpperCase() || 'ROUTE'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.capText}>
                  Capacity {bus.occupied} / {bus.capacity}
                </Text>
                <Text style={styles.presentText}>Present today: {bus.present_today}</Text>
              </View>

              <ProgressBar percent={pct} color={barColor} />
              {isFull && <Text style={styles.fullText}>Bus Full • Consider shifting students</Text>}
            </View>
          );
        })}
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

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ---- Lighter styles consistent with other dashboards ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, backgroundColor: '#f7f7fb',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6b7280', marginTop: 6 },

  statBar: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
  },
  statItem: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statLabel: { color: '#6b7280', fontSize: 12 },
  statValue: { color: '#111827', fontSize: 20, fontWeight: '700' },

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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  route: { fontSize: 12, color: '#4b5563' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  capText: { color: '#374151', fontSize: 13 },
  presentText: { color: '#10b981', fontSize: 13 },

  progressOuter: { height: 8, borderRadius: 8, backgroundColor: '#e5e7eb', marginTop: 10, overflow: 'hidden' },
  progressInner: { height: 8, borderRadius: 8 },
  fullText: { color: '#ef4444', fontSize: 12, marginTop: 8, fontWeight: '600' },
});
