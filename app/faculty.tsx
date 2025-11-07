// app/faculty.tsx
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FacultyDashboard() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty Dashboard</Text>
      <Text style={styles.id}>ID: {id}</Text>
      <Text style={styles.info}>Priority Seat: 1</Text>
      <Text style={styles.info}>Flexible Route</Text>
      <Text style={styles.info}>No Fee Required</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecfeff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0e7490', marginBottom: 20 },
  id: { fontSize: 18, marginBottom: 40 },
  info: { fontSize: 18, backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '80%', textAlign: 'center', marginVertical: 10 },
});