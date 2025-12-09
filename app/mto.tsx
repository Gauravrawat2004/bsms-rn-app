
// app/mto.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MTOHub() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MTO Dashboard</Text>
        <Text style={styles.subTitle}>Manage bus operations, assignments & data</Text>
      </View>

      {/* Actions */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.card, styles.cardPrimary]}
          onPress={() => router.push('/mt/live')}
        >
          <View style={styles.cardIconRow}>
            <Ionicons name="bus-outline" size={28} color="#0a67d3" />
            <Text style={styles.cardTitle}>Live Status</Text>
          </View>
          <Text style={styles.cardDesc}>
            View occupancy, capacity, present today & routes for each bus.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/mt/data')}
        >
          <View style={styles.cardIconRow}>
            <Ionicons name="cloud-upload-outline" size={28} color="#4f46e5" />
            <Text style={styles.cardTitle}>Data / CSV</Text>
          </View>
          <Text style={styles.cardDesc}>
            Upload Bus & Student CSV to update assignments and seats.
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ---- Styles: lighter theme, similar to other dashboards ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  grid: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPrimary: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
  },
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280' },
});
