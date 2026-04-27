
// app/faculty.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Dialog, Divider, Portal, Text, TextInput } from 'react-native-paper';
import { API_BASE } from './config/api';

type Faculty = {
  faculty_id: string;
  phone?: string;
  name: string;
  department?: string;
  assigned_bus?: number | null;
  bus_no?: number | null;
};

type BusInfo = {
  bus_no: number;
  route?: string;
  vehicle_no?: string;
  driver?: string;
  driver_contact?: string;
  time?: string;
};

export default function FacultyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const facultyId = useMemo(() => id ?? '', [id]);

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [routeDialogVisible, setRouteDialogVisible] = useState(false);
  const [requestedRoute, setRequestedRoute] = useState('');
  const [sendingRoute, setSendingRoute] = useState(false);

  async function loadFaculty() {
    try {
      setLoading(true);
      const endpoints = [
        `${API_BASE}/api/faculty/${encodeURIComponent(facultyId)}`,
        `${API_BASE}/api/mto/faculties`,
      ];

      for (const endpoint of endpoints) {
        const res = await fetch(endpoint);
        if (!res.ok) continue;
        const data = await res.json();

        if (Array.isArray(data)) {
          const match = data.find((item: Faculty) => item.faculty_id === facultyId);
          if (match) {
            const nextFaculty = {
              ...match,
              assigned_bus: match.assigned_bus ?? match.bus_no ?? null,
            };
            setFaculty(nextFaculty);
            await loadBusInfo(nextFaculty.assigned_bus ?? null);
            return;
          }
          continue;
        }

        if (data?.faculty_id) {
          const nextFaculty = {
            ...data,
            assigned_bus: data.assigned_bus ?? data.bus_no ?? null,
          };
          setFaculty(nextFaculty);
          await loadBusInfo(nextFaculty.assigned_bus ?? null);
          return;
        }
      }

      setFaculty(null);
      setBusInfo(null);
    } catch (e) {
      console.warn('Failed to load faculty:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBusInfo(busNo: number | null) {
    if (!busNo) {
      setBusInfo(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/buses`);
      if (!res.ok) {
        setBusInfo(null);
        return;
      }
      const buses: BusInfo[] = await res.json();
      setBusInfo(buses.find((bus) => bus.bus_no === busNo) ?? null);
    } catch (e) {
      console.warn('Failed to load bus info:', e);
      setBusInfo(null);
    }
  }

  useEffect(() => {
    if (facultyId) loadFaculty();
  }, [facultyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFaculty();
    setRefreshing(false);
  };

  async function requestRouteChange() {
    if (!requestedRoute.trim() || !faculty) return;
    try {
      setSendingRoute(true);
      const message = `Route change request: ${requestedRoute.trim()}`;
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'faculty',
          user_id: facultyId,
          name: faculty.name || facultyId,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setRequestedRoute('');
      setRouteDialogVisible(false);
    } catch (e) {
      console.warn('Failed to request route change:', e);
    } finally {
      setSendingRoute(false);
    }
  }

  if (!facultyId) {
    return (
      <View style={styles.centered}>
        <Text>Navigate with a valid Faculty ID.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading faculty details…</Text>
      </View>
    );
  }

  if (!faculty) {
    return (
      <View style={styles.centered}>
        <Text>No faculty found for ID: {facultyId}</Text>
        <Button mode="contained" onPress={loadFaculty} style={{ marginTop: 12 }}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Faculty Dashboard
          </Text>

          <Text variant="titleMedium">{faculty.name}</Text>
          <Text>ID: {faculty.faculty_id}</Text>
          {faculty.department ? <Text>Dept: {faculty.department}</Text> : null}
          {faculty.phone ? <Text>Phone: {faculty.phone}</Text> : null}

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.chips}>
            <Chip icon="star" style={styles.chip}>
              Priority Seat: Front seat
            </Chip>
            <Chip icon="bus" style={styles.chip}>
              Assigned Bus: {faculty.assigned_bus ?? 'N/A'}
            </Chip>
          </View>

          {busInfo ? (
            <View style={styles.busInfoBox}>
              <Text style={styles.busInfoTitle}>Assigned Route Details</Text>
              <Text>Route: {busInfo.route ?? 'N/A'}</Text>
              <Text>Vehicle: {busInfo.vehicle_no ?? 'N/A'}</Text>
              <Text>
                Driver: {busInfo.driver ?? 'N/A'}
                {busInfo.driver_contact ? ` (${busInfo.driver_contact})` : ''}
              </Text>
              <Text>Departure: {busInfo.time ?? 'N/A'}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button mode="contained" onPress={() => setRouteDialogVisible(true)}>
              Request Route Change
            </Button>
            <Button mode="outlined" onPress={onRefresh}>Refresh</Button>
            <Button
              mode="text"
              onPress={() =>
                router.push({ pathname: '/chat', params: { role: 'faculty', id: facultyId, name: faculty?.name || facultyId } })
              }
            >
              Chat
            </Button>
          </View>
        </Card.Content>
      </Card>
      <Portal>
        <Dialog visible={routeDialogVisible} onDismiss={() => setRouteDialogVisible(false)}>
          <Dialog.Title>Request Route Change</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Requested new route"
              value={requestedRoute}
              onChangeText={setRequestedRoute}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRouteDialogVisible(false)}>Cancel</Button>
            <Button onPress={requestRouteChange} loading={sendingRoute} disabled={!requestedRoute.trim() || sendingRoute}>
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16 },
  title: { marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { borderRadius: 12 },
  busInfoBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  busInfoTitle: { fontWeight: '700', color: '#111827', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
});
