import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function InchargeDashboard() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkpoint Incharge</Text>
      <Text style={styles.id}>ID: {id}</Text>
      <Text style={styles.btn}>Bus Shifting</Text>
      <Text style={styles.btn}>Emergency Alert</Text>
      <Text style={styles.btn}>Pause Route</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef3c7' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#b45309', marginBottom: 20 },
  id: { fontSize: 18, marginBottom: 40 },
  btn: { fontSize: 18, backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '80%', textAlign: 'center', marginVertical: 10 },
});