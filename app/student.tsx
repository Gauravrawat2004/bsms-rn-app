
// app/student.tsx
import * as DocumentPicker from 'expo-document-picker';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text } from 'react-native-paper';
import { API_BASE } from './config/api';

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
  photo_url?: string | null;
};

export default function StudentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const studentId = useMemo(() => id ?? '', [id]);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadPhoto = async () => {
    try {
      // Use document picker with image MIME types
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        Alert.alert('Error', 'Invalid file selected');
        return;
      }

      setUploading(true);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('photo', {
        uri: file.uri,
        type: file.mimeType || 'image/jpeg',
        name: file.name || `photo_${studentId}.jpg`,
      } as any);

      const response = await fetch(
        `${API_BASE}/api/student/${encodeURIComponent(studentId)}/photo`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      Alert.alert('Success', 'Photo uploaded successfully');
      // Refresh student data to get updated photo URL
      await fetchStudent();
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

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

          {/* Photo Section */}
          <View style={styles.photoSection}>
            {student.photo_url ? (
              <ExpoImage
                source={{ uri: student.photo_url }}
                style={styles.photo}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>No Photo</Text>
              </View>
            )}
            <Button
              mode="contained"
              onPress={uploadPhoto}
              loading={uploading}
              disabled={uploading}
              style={styles.uploadButton}
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </View>

          <Text variant="titleMedium" style={styles.nameText}>{student.name}</Text>
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
  photoSection: { alignItems: 'center', marginVertical: 16 },
  photo: { width: 140, height: 180, borderRadius: 8, marginBottom: 12 },
  photoPlaceholder: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderText: { color: '#9ca3af', fontSize: 14 },
  uploadButton: { width: '100%', marginBottom: 8 },
  nameText: { marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { borderRadius: 12 },
  statusRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  statusChip: { borderRadius: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
});
