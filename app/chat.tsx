import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    FlatList,
    SafeAreaView, StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const API_BASE = "https://antonetta-historiographical-vernacularly.ngrok-free.dev";

type ChatEntry = {
  role: string;
  user_id: string;
  name: string;
  message: string;
  ts: string;
};

export default function ChatScreen() {
  const { role, id, name } = useLocalSearchParams<{ role?: string; id?: string; name?: string }>();
  const [msgs, setMsgs] = useState<ChatEntry[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages`);
      const j = await res.json();
      setMsgs(j);
    } catch (e) {
      console.warn('Chat load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as unknown as number);
    };
  }, []);

  const send = async () => {
    if (!text.trim() || !role || !id || !name) return;
    try {
      await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, user_id: id, name, message: text.trim() }),
      });
      setText('');
      await load();
    } catch (e) {
      console.warn('Chat send error', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat ({role || 'unknown'})</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={msgs}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.msgRow}>
                <Text style={styles.msgAuthor}>{`${item.name} (${item.role})`}</Text>
                <Text>{item.message}</Text>
                <Text style={styles.msgTs}>{new Date(item.ts).toLocaleTimeString()}</Text>
              </View>
            )}
            scrollEnabled={true}
          />
        )}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type message..."
          placeholderTextColor="#999"
        />
        <Button onPress={send} title="Send" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  msgRow: { padding: 8, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  msgAuthor: { fontSize: 12, fontWeight: '600' },
  msgTs: { fontSize: 10, color: '#6b7280' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginRight: 8, height: 40 },
});