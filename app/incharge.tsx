
// app/incharge.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Text,
  TextInput,
} from 'react-native-paper';

type BusSummary = {
  bus_no: number;
  capacity: number;
  occupied: number;
  present_today: number;
  route?: string | null;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.100:3001';

export default function InchargeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const inchargeId = useMemo(() => id ?? '', [id]);

  const [summary, setSummary] = useState<BusSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [routeFilter, setRouteFilter] = useState<string>('');
  const [alertMsg, setAlertMsg] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<string>('');

  async function loadSummary() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/incharge/summary`);
      const data = await res.json();
      setSummary(data || []);
    } catch (e) {
      console.warn('Failed to load summary:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }

  async function broadcastAlert() {
    if (!alertMsg.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/incharge/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incharge_id: inchargeId || 'INCHARGE', message: alertMsg }),
      });
      const out = await res.json();
      setAlertInfo(out?.message ? 'Alert sent' : 'Alert dispatched');
      setAlertMsg('');
      setTimeout(() => setAlertInfo(''), 2500);
    } catch (e) {
      console.warn('Failed to broadcast alert:', e);
      setAlertInfo('Failed. Check server.');
      setTimeout(() => setAlertInfo(''), 2500);
    }
  }

  const filtered = summary.filter((b) =>
    routeFilter ? (b.route || '').toLowerCase().includes(routeFilter.toLowerCase()) : true
  );

  const totals = filtered.reduce(
    (acc, b) => {
      acc.buses += 1;
      acc.capacity += b.capacity || 0;
      acc.occupied += b.occupied || 0;
      acc.present += b.present_today || 0;
      return acc;
    },
    { buses: 0, capacity: 0, occupied: 0, present: 0 }
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading transport summary…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header / Controls */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>Incharge Dashboard</Text>
          <Text>ID: {inchargeId || '—'}</Text>

          <Divider style={{ marginVertical: 12 }} />

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <Chip icon="bus" style={styles.chip}>Buses: {totals.buses}</Chip>
            <Chip icon="seat" style={styles.chip}>Capacity: {totals.capacity}</Chip>
            <Chip icon="account-group" style={styles.chip}>Occupied: {totals.occupied}</Chip>
            <Chip icon="check-circle" style={styles.chip}>Present Today: {totals.present}</Chip>
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
            <TextInput
              mode="outlined"
              label="Filter by Route"
              placeholder="e.g., Kamaluwaganja"
              value={routeFilter}
              onChangeText={setRouteFilter}
              style={{ flex: 1 }}
              left={<TextInput.Icon icon="map-marker-path" />}
            />
            <Button mode="outlined" onPress={refresh} style={{ marginLeft: 8 }}>
              Refresh
            </Button>
          </View>

          {/* Broadcast alert */}
          <View style={[styles.filtersRow, { marginTop: 8 }]}>
            <TextInput
              mode="outlined"
              label="Broadcast Alert"
              placeholder="Emergency: All buses hold position."
              value={alertMsg}
              onChangeText={setAlertMsg}
              style={{ flex: 1 }}
              left={<TextInput.Icon icon="bullhorn" />}
            />
            <Button mode="contained" onPress={broadcastAlert} style={{ marginLeft: 8 }}>
              Send
            </Button>
          </View>
          {alertInfo ? <Text style={{ marginTop: 6, opacity: 0.8 }}>{alertInfo}</Text> : null}
        </Card.Content>
      </Card>

      {/* Bus list */}
      <FlatList
        data={filtered}
        keyExtractor={(b) => String(b.bus_no)}
        refreshing={refreshing}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <Card style={styles.busCard} mode="elevated">
            <Card.Content>
              <View style={styles.busHeader}>
                <Text variant="titleMedium">Bus {item.bus_no}</Text>
                <Chip icon="map-marker" style={styles.chip}>
                  Route: {item.route ?? 'N/A'}
                </Chip>
              </View>
              <View style={styles.busRow}>
                <Chip icon="seat" style={styles.chip}>Capacity: {item.capacity}</Chip>
                <Chip icon="account-group" style={styles.chip}>Occupied: {item.occupied}</Chip>
                <Chip icon="check-circle" style={styles.chip}>Present Today: {item.present_today}</Chip>
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20 },
  title: { marginBottom: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  chip: { borderRadius: 16 },
  filtersRow: { flexDirection: 'row', alignItems: 'center' },
  busCard: { marginTop: 12, borderRadius: 20 },
  busHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  busRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
