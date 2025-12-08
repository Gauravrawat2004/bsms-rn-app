
// app/student.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text } from 'react-native-paper';

type Student = {
  student_id: string;
  name: string;
  bus_no: number | null;
  seat: number | null;
  present: boolean;
  fee_paid: boolean;
  route?: string;
  course?: string | null;
  year?: number | null;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.100:3001';

export default function StudentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const studentId = useMemo(() => id ?? '', [id]);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function fetchStudent() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/student/${encodeURIComponent(studentId)}`);
      const data = await res.json();
      setStudent(data);
    } catch (e) {
      console.warn('Failed to fetch student:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (studentId) fetchStudent();
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudent();
    setRefreshing(false);
  };

  if (!studentId) {
    return (
      <View style={styles.centered}>
        <Text>Please navigate with a valid Student ID.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading student details…</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centered}>
        <Text>Student not found for ID: {studentId}</Text>
        <Button mode="contained" onPress={fetchStudent} style={{ marginTop: 12 }}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Student Dashboard
          </Text>
          <Text variant="titleMedium">{student.name}</Text>
          <Text>ID: {student.student_id}</Text>
          {student.course ? <Text>Course: {student.course}</Text> : null}
          {student.year ? <Text>Year: {student.year}</Text> : null}

          <View style={styles.chips}>
            <Chip icon="bus" style={styles.chip}>Bus: {student.bus_no ?? 'N/A'}</Chip>
            <Chip icon="seat" style={styles.chip}>Seat: {student.seat ?? 'N/A'}</Chip>
            <Chip icon="map-marker" style={styles.chip}>Route: {student.route ?? 'N/A'}</Chip>
          </View>

          <View style={styles.statusRow}>
            <Chip
              icon={student.present ? 'check-circle' : 'close-circle'}
              mode="flat"
              style={styles.statusChip}
            >
              {student.present ? 'Present' : 'Absent'}
            </Chip>
            <Chip
              icon={student.fee_paid ? 'cash-check' : 'cash-remove'}
              mode="flat"
              style={styles.statusChip}
            >
              {student.fee_paid ? 'Fee Paid' : 'Fee Due'}
            </Chip>
          </View>

          {/* Read-only: students cannot mark attendance themselves */}
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onRefresh}>Refresh</Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16 },
  title: { marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { borderRadius: 12 },
  statusRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  statusChip: { borderRadius: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
});
