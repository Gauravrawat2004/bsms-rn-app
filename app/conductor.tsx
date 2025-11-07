// app/conductor.tsx
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ConductorDashboard() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conductor Panel</Text>
      <Text style={styles.id}>ID: {id}</Text>
      <Text style={styles.btn}>Mark Attendance</Text>
      <Text style={styles.btn}>Add Extra Passenger</Text>
      <Text style={styles.btn}>Send Hindi Alert</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffbeb' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d97706', marginBottom: 20 },
  id: { fontSize: 18, marginBottom: 40 },
  btn: { fontSize: 18, backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '80%', textAlign: 'center', marginVertical: 10 },
});