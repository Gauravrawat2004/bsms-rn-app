import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    Button,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView, StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from './config/api';

type ChatEntry = {
  role: string;
  user_id: string;
  name: string;
  message: string;
  ts: string;
};

type FacultyRow = {
  faculty_id: string;
  name: string;
};

type BusRow = {
  conductor_id?: string;
  conductor_name?: string;
};

export default function ChatScreen() {
  const { role, id, name } = useLocalSearchParams<{ role?: string; id?: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatEntry[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDirectory = async () => {
    const nextMap: Record<string, string> = {};

    try {
      const facultyRes = await fetch(`${API_BASE}/api/mto/faculties`);
      const facultyRows: FacultyRow[] = facultyRes.ok ? await facultyRes.json() : [];
      for (const row of facultyRows) {
        if (row.faculty_id && row.name) nextMap[row.faculty_id] = row.name;
      }
    } catch (e) {
      console.warn('Failed to load faculty name directory', e);
    }

    try {
      const busRes = await fetch(`${API_BASE}/api/buses`);
      const buses: BusRow[] = busRes.ok ? await busRes.json() : [];
      for (const row of buses) {
        if (row.conductor_id && row.conductor_name) {
          nextMap[row.conductor_id] = row.conductor_name;
        }
      }
    } catch (e) {
      console.warn('Failed to load conductor name directory', e);
    }

    if (id && name) {
      nextMap[id] = name;
    }

    setNameMap(nextMap);
  };

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
    loadDirectory();
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as unknown as number);
    };
  }, []);

  const send = async () => {
    if (!text.trim() || !role || !id || !name) return;
    try {
      const resp = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, user_id: id, name, message: text.trim() }),
      });
      if (!resp.ok) {
        throw new Error('Failed to send message');
      }
      setText('');
      await load();
    } catch (e) {
      console.warn('Chat send error', e);
      Alert.alert('Chat error', 'Failed to send message.');
    }
  };

  const senderLabel = [name, role].filter(Boolean).join(' • ');

  const resolveName = (entry: ChatEntry) =>
    entry.name || nameMap[entry.user_id] || entry.user_id;

  const ownId = id || '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{name || 'Chat'}</Text>
        <Text style={styles.subtitle}>{senderLabel || 'Unknown sender'}</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 12}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={[...msgs].reverse()}
            keyExtractor={(item, idx) => idx.toString()}
            inverted
            renderItem={({ item }) => (
              <View style={[
                styles.msgRow,
                item.user_id === ownId ? styles.msgRowOwn : styles.msgRowOther,
              ]}>
                <View style={[
                  styles.bubble,
                  item.user_id === ownId ? styles.bubbleOwn : styles.bubbleOther,
                ]}>
                  <Text style={styles.msgAuthor}>{resolveName(item)}</Text>
                  <Text style={styles.msgMeta}>{`${item.role} • ${item.user_id}`}</Text>
                  <Text style={styles.msgText}>{item.message}</Text>
                  <Text style={styles.msgTs}>{new Date(item.ts).toLocaleTimeString()}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type message..."
            placeholderTextColor="#999"
            multiline
          />
          <Button onPress={send} title="Send" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  content: { flex: 1 },
  listContent: { padding: 12, gap: 8, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', marginVertical: 4 },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOwn: { backgroundColor: '#dcf8c6', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#ffffff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  msgAuthor: { fontSize: 12, fontWeight: '600' },
  msgMeta: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  msgText: { color: '#111827' },
  msgTs: { fontSize: 10, color: '#6b7280', alignSelf: 'flex-end', marginTop: 4 },
  inputRow: { flexDirection: 'row', paddingTop: 8, paddingHorizontal: 8, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, minHeight: 42, maxHeight: 100, backgroundColor: '#fff' },
});
