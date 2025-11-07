// app/index.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

const demoUsers: Record<string, string> = {
  'S101': 'student',
  'C001': 'conductor',
  'MTO1': 'mto',
  'INC1': 'incharge',
  'F001': 'faculty',
};

export default function LoginScreen() {
  const [id, setId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();

  const handleLogin = (): void => {
    if (demoUsers[id]) {
      const role = demoUsers[id];
      if (role === 'student') {
        router.replace({
          pathname: '/student',
          params: { id }
        });
      } else {
        Alert.alert('Error', 'Only student role is supported at the moment.');
      }
    } else {
      Alert.alert('Error', 'Invalid ID. Try: S101, C001, MTO1, INC1, F001');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BSMS Login</Text>
      <TextInput
        placeholder="User ID"
        value={id}
        onChangeText={setId}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="default"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={{ marginTop: 20 }}>
        <Button title="LOGIN" onPress={handleLogin} color="#1e3a8a" />
      </View>
      <Text style={styles.demo}>Demo: S101, C001, MTO1, INC1, F001</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: '#1e293b' },
  input: { 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    padding: 14, 
    marginBottom: 16, 
    borderRadius: 12, 
    backgroundColor: '#fff',
    fontSize: 16
  },
  demo: { marginTop: 24, color: '#64748b', textAlign: 'center', fontSize: 13 },
});