// app/mto.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MTODashboard() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [uploading, setUploading] = useState<'buses' | 'students' | null>(null);

  const uploadCSV = async (type: 'buses' | 'students') => {
    setUploading(type);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (result.canceled) return;

      const file = result.assets[0];
      const formData = new FormData();
      formData.append('csv', {
        uri: file.uri,
        name: file.name,
        type: 'text/csv',
      } as any);

      const res = await fetch(`http://192.168.1.100:3001/api/mto/upload-${type}`, {
        method: 'POST',
        headers: { 'x-role': 'mto' },
        body: formData,
      });

      const data = await res.json();
      Alert.alert('Success', data.message || 'Uploaded!');
    } catch (err) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>MTO Dashboard</Text>
      <Text style={styles.id}>Welcome, {id}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Upload Buses (56 Buses)</Text>
        {uploading === 'buses' ? <ActivityIndicator /> : 
          <Button title="Upload Buses CSV" onPress={() => uploadCSV('buses')} color="#166534" />}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Upload Students (Fee Paid)</Text>
        {uploading === 'students' ? <ActivityIndicator /> : 
          <Button title="Upload Students CSV" onPress={() => uploadCSV('students')} color="#166534" />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f0fdf4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#166534', textAlign: 'center', marginVertical: 20 },
  id: { fontSize: 18, textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginVertical: 12, elevation: 5 },
  label: { fontSize: 18, fontWeight: '600', color: '#166534', marginBottom: 10 },
});