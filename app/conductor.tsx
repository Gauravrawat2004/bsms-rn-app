
// app/conductor.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Switch, Text, TextInput } from 'react-native-paper';

type Student = {
  student_id: string;
  name: string;
  seat: number | null;
  present: boolean;
  bus_no: number;
  is_temp?: boolean;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.100:3001';

export default function ConductorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conductorId = useMemo(() => id ?? '', [id]);

  const [busNo, setBusNo] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Add passenger form
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerId, setPassengerId] = useState<string>('');
  const [ticketMode, setTicketMode] = useState<boolean>(true); // true = one-day

  async function resolveBus() {
    try {
      const res = await fetch(`${API_BASE}/api/conductor/${encodeURIComponent(conductorId)}`);
      if (res.ok) {
        const data = await res.json(); // { bus_no: number }
        setBusNo(data.bus_no);
        return data.bus_no;
      }
    } catch (e) {
      console.warn('Failed to fetch conductor assignment:', e);
    }
    const map: Record<string, number> = { C001: 1, C004: 4, C011: 11 };
    const fallbackBus = map[conductorId] ?? null;
    setBusNo(fallbackBus);
    return fallbackBus;
  }

  async function loadStudents(bus: number | null) {
    if (!bus) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/students?bus_no=${bus}`);
      const data = await res.json();
      setStudents(data);
    } catch (e) {
      console.warn('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const bus = await resolveBus();
      await loadStudents(bus);
    })();
  }, [conductorId]);

  async function markAttendance(student_id: string, present: boolean) {
    try {
      const res = await fetch(`${API_BASE}/api/conductor/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, present, conductor_id: conductorId }),
      });
      if (!res.ok) throw new Error('Attendance update failed');
      setStudents((prev) => prev.map((s) => (s.student_id === student_id ? { ...s, present } : s)));
    } catch (e) {
      console.warn('Failed to update attendance:', e);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadStudents(busNo);
    setRefreshing(false);
  }

  async function addPassenger() {
    if (!passengerName.trim()) return;

    try {
      const endpoint = ticketMode ? 'ticket' : 'add-student';
      const resp = await fetch(`${API_BASE}/api/conductor/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductor_id: conductorId,
          name: passengerName,
          student_id: passengerId || undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.warn('Add passenger error:', json?.error || 'Unknown error');
      }
      // Reset form
      setPassengerName('');
      setPassengerId('');
      setTicketMode(true);
      await loadStudents(busNo);
    } catch (e) {
      console.warn('Failed to add passenger:', e);
    }
  }

  async function removeTicket(student_id: string) {
    try {
      const resp = await fetch(`${API_BASE}/api/conductor/ticket/${encodeURIComponent(student_id)}`, {
        method: 'DELETE',
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.warn('Remove ticket error:', json?.error || 'Unknown error');
      }
      await loadStudents(busNo);
    } catch (e) {
      console.warn('Failed to remove ticket:', e);
    }
  }

  if (!conductorId) {
    return (
      <View style={styles.centered}>
        <Text>Please navigate with a valid Conductor ID.</Text>
      </View>
    );
  }

  if (loading && busNo === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading conductor assignment…</Text>
      </View>
    );
  }

  if (!busNo) {
    return (
      <View style={styles.centered}>
        <Text>You are not assigned to any bus.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Conductor — Bus {busNo}
          </Text>
          <Divider style={{ marginVertical: 12 }} />

          {/* Add passenger (ticket/permanent) */}
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>Add Passenger</Text>
          <View style={styles.addRow}>
            <TextInput
              mode="outlined"
              label="Name (required)"
              value={passengerName}
              onChangeText={setPassengerName}
              style={{ flex: 1 }}
            />
            <TextInput
              mode="outlined"
              label="Student ID (optional)"
              value={passengerId}
              onChangeText={setPassengerId}
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.addRow2}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Switch value={ticketMode} onValueChange={setTicketMode} />
              <Text>Ticket (one-day)</Text>
            </View>
            <Button mode="contained" onPress={addPassenger}>Add</Button>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Chip icon="account-group" style={styles.chip}>
              Total Today: {students.length}
            </Chip>
            <Button mode="outlined" onPress={refresh}>Refresh</Button>
          </View>
        </Card.Content>
      </Card>

      <FlatList
        data={students}
        keyExtractor={(item) => item.student_id}
        onRefresh={refresh}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <Card.Content>
              <View style={styles.itemHeader}>
                <Text variant="titleMedium">{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {item.is_temp ? <Chip icon="ticket-confirmation" style={styles.statusChip}>Ticket</Chip> : null}
                  <Chip icon={item.present ? 'check-circle' : 'close-circle'} style={styles.statusChip}>
                    {item.present ? 'Present' : 'Absent'}
                  </Chip>
                </View>
              </View>
              <Text>Seat: {item.seat ?? 'N/A'}</Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <Button
                  mode="contained"
                  onPress={() => markAttendance(item.student_id, true)}
                  disabled={item.present}
                >
                  Mark Present
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => markAttendance(item.student_id, false)}
                  disabled={!item.present}
                >
                  Mark Absent
                </Button>

                {/* Remove ticket button for ticket passengers */}
                {item.is_temp ? (
                  <Button mode="outlined" onPress={() => removeTicket(item.student_id)}>
                    Remove Ticket
                  </Button>
                ) : null}
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
  card: { borderRadius: 16 },
  title: { marginBottom: 6 },
  chip: { borderRadius: 10 },
  item: { marginTop: 10, borderRadius: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { borderRadius: 10 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addRow2: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
});
