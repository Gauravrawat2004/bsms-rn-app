import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Interface banao
interface RouteParams extends Record<string, string | string[] | undefined> {
  id?: string;
}

export default function StudentDashboard() {
  // Use type assertion for the returned params
  const { id } = useLocalSearchParams() as RouteParams;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Student!</Text>
      <Text style={styles.id}>ID: {id || 'N/A'}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Bus</Text>
        <Text style={styles.value}>Route 1 - Bus 1 (36 seater)</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Seat</Text>
        <Text style={styles.value}>35</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Next Stop</Text>
        <Text style={styles.value}>7:15 AM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f1f5f9',
    justifyContent: 'center'
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#1e40af', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  id: { 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 24, 
    color: '#475569' 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 14, 
    marginVertical: 8, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  label: { 
    fontSize: 14, 
    color: '#64748b', 
    fontWeight: '600' 
  },
  value: { 
    fontSize: 18, 
    color: '#1e293b', 
    marginTop: 4, 
    fontWeight: '500' 
  },
});