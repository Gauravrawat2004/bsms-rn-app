
// app/mto.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Text, TextInput } from 'react-native-paper';

type Bus = {
  bus_no: number;
  vehicle_no?: string;
  driver?: string;
  driver_contact?: string | null;
  helper?: string | null;
  helper_contact?: string | null;
  route?: string;
  time?: string;
  capacity?: number;
  conductor_id?: string | null;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.100:3001';

export default function MTOScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const mtoId = useMemo(() => id ?? '', [id]);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [studentId, setStudentId] = useState<string>('');
  const [targetBus, setTargetBus] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [uploadingBuses, setUploadingBuses] = useState(false);
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [busesUploadMsg, setBusesUploadMsg] = useState<string>('');
  const [studentsUploadMsg, setStudentsUploadMsg] = useState<string>('');

  async function loadBuses() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/buses`);
      const data = await res.json();
      setBuses(data);
    } catch (e) {
      console.warn('Failed to load buses:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuses();
  }, []);

  async function pickAndUpload(endpoint: 'upload-buses' | 'upload-students') {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) return;

    const formData = new FormData();
    formData.append('csv', {
      uri: file.uri,
      name: file.name ?? (endpoint === 'upload-buses' ? 'bus_data.csv' : 'student_data.csv'),
      type: file.mimeType ?? 'text/csv',
    } as any);

    try {
      endpoint === 'upload-buses' ? setUploadingBuses(true) : setUploadingStudents(true);

      // IMPORTANT: don't set Content-Type; let fetch add boundary automatically
      const resp = await fetch(`${API_BASE}/api/mto/${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const json = await resp.json();

      if (endpoint === 'upload-buses') setBusesUploadMsg(`${json.message} (count: ${json.count ?? 0})`);
      else setStudentsUploadMsg(`${json.message} (added: ${json.added ?? 0})`);

      await loadBuses(); // refresh list
    } catch (e) {
      console.warn('Upload error:', e);
      if (endpoint === 'upload-buses') setBusesUploadMsg('Upload failed. Check server logs.');
      else setStudentsUploadMsg('Upload failed. Check server logs.');
    } finally {
      endpoint === 'upload-buses' ? setUploadingBuses(false) : setUploadingStudents(false);
    }
  }

  async function assignStudent() {
    if (!studentId || !targetBus) return;
    try {
      const res = await fetch(`${API_BASE}/api/mto/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mto_id: mtoId || 'MTO',
          student_id: studentId,
          bus_no: Number(targetBus),
        }),
      });
      const out = await res.json();
      await loadBuses();
      setStudentId('');
      setTargetBus('');
      setStudentsUploadMsg(out.message ?? 'Assigned');
    } catch (e) {
      console.warn('Failed to assign student:', e);
    }
  }

  async function reassignConductor(bus_no: number, conductor_id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/mto/conductor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_no, conductor_id }),
      });
      const out = await res.json();
      await loadBuses();
      setBusesUploadMsg(out.message ?? 'Conductor reassigned');
    } catch (e) {
      console.warn('Failed to reassign conductor:', e);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadBuses();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading buses…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            MTO Dashboard
          </Text>
          <Text>ID: {mtoId || '—'}</Text>

          <Divider style={{ marginVertical: 12 }} />

          {/* CSV Upload section */}
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            Upload CSV
          </Text>

          <View style={styles.uploadRow}>
            <Button
              mode="contained"
              onPress={() => pickAndUpload('upload-buses')}
              loading={uploadingBuses}
              disabled={uploadingBuses}
            >
              Upload Buses CSV
            </Button>
            {busesUploadMsg ? <Text style={styles.msg}>{busesUploadMsg}</Text> : null}
          </View>

          <View style={[styles.uploadRow, { marginTop: 8 }]}>
            <Button
              mode="contained"
              onPress={() => pickAndUpload('upload-students')}
              loading={uploadingStudents}
              disabled={uploadingStudents}
            >
              Upload Students CSV
            </Button>
            {studentsUploadMsg ? <Text style={styles.msg}>{studentsUploadMsg}</Text> : null}
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {/* Assign student to bus */}
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            Assign Student to Bus
          </Text>
          <View style={styles.assignRow}>
            <TextInput
              mode="outlined"
              label="Student ID"
              value={studentId}
              onChangeText={setStudentId}
              style={{ flex: 1 }}
            />
            <TextInput
              mode="outlined"
              label="Bus No."
              value={targetBus}
              onChangeText={setTargetBus}
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
            <Button mode="contained" onPress={assignStudent} disabled={!studentId || !targetBus}>
              Assign
            </Button>
          </View>
        </Card.Content>
      </Card>

      <FlatList
        data={buses}
        keyExtractor={(b) => String(b.bus_no)}
        refreshing={refreshing}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <Card style={styles.busCard}>
            <Card.Content>
              <View style={styles.busHeader}>
                <Text variant="titleMedium">Bus {item.bus_no}</Text>
                <Chip icon="account" style={styles.chip}>
                  Conductor: {item.conductor_id ?? 'N/A'}
                </Chip>
              </View>
              <View style={styles.busRow}>
                <Chip icon="bus" style={styles.chip}>
                  Vehicle: {item.vehicle_no ?? 'N/A'}
                </Chip>
                <Chip icon="account-group" style={styles.chip}>
                  Capacity: {item.capacity ?? 36}
                </Chip>
                <Chip icon="map-marker-path" style={styles.chip}>
                  Route: {item.route ?? 'N/A'}
                </Chip>
                <Chip icon="clock" style={styles.chip}>
                  Time: {item.time ?? 'N/A'}
                </Chip>
              </View>

              {/* Quick example to reassign conductor */}
              <View style={styles.reassignRow}>
                <TextInput
                  mode="outlined"
                  label="New Conductor ID"
                  onSubmitEditing={(e) => reassignConductor(item.bus_no, e.nativeEvent.text)}
                  placeholder="C004"
                  style={{ flex: 1 }}
                />
                <Button
                  mode="outlined"
                  onPress={() => reassignConductor(item.bus_no, 'C004')}
                >
                  Set C004
                </Button>
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
  uploadRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  msg: { opacity: 0.8 },
  assignRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  busCard: { marginTop: 12, borderRadius: 16 },
  busHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  busRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderRadius: 10 },
  reassignRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
});
