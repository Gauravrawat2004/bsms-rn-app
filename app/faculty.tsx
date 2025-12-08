
// app/faculty.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Text } from 'react-native-paper';

type Faculty = {
  faculty_id: string;
  name: string;
  department?: string;
  priority_seat?: boolean;
  flexible_route?: boolean;
  fee_required?: boolean;
  assigned_bus?: number | null;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.100:3001';

export default function FacultyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const facultyId = useMemo(() => id ?? '', [id]);

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function loadFaculty() {
    try {
      setLoading(true);
      // Replace with your actual faculty endpoint or Supabase query
      // For now, simulate static privileges
      setFaculty({
        faculty_id: facultyId,
        name: 'Faculty User',
        department: 'CSE',
        priority_seat: true,
        flexible_route: true,
        fee_required: false,
        assigned_bus: null,
      });
    } catch (e) {
      console.warn('Failed to load faculty:', e);
    } finally {
      setLoading(false);
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
    try {
      const res = await fetch(`${API_BASE}/api/faculty/request-route-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faculty_id: facultyId }),
      });
      if (!res.ok) throw new Error('Request failed');
    } catch (e) {
      console.warn('Failed to request route change:', e);
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

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.chips}>
            <Chip icon="star" style={styles.chip}>
              Priority Seat: {faculty.priority_seat ? 'Yes' : 'No'}
            </Chip>
            <Chip icon="shuffle" style={styles.chip}>
              Flexible Route: {faculty.flexible_route ? 'Yes' : 'No'}
            </Chip>
            <Chip icon="cash" style={styles.chip}>
              Fee Required: {faculty.fee_required ? 'Yes' : 'No'}
            </Chip>
            <Chip icon="bus" style={styles.chip}>
              Assigned Bus: {faculty.assigned_bus ?? 'N/A'}
            </Chip>
          </View>

          <View style={styles.actions}>
            <Button mode="contained" onPress={requestRouteChange}>
              Request Route Change
            </Button>
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
});
