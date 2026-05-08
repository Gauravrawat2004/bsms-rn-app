import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from './config/api';
import {
  getDevicePushToken,
  registerDeviceToken,
  usePushNotifications,
} from './utils/Notification';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatEntry[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup push notifications for messages and alerts
  usePushNotifications(
    // On chat message received
    (notification: Notifications.Notification) => {
      console.log('New chat message:', notification.request.content.body);
      // Reload messages
      load();
    },
    // On alert received
    (notification: Notifications.Notification) => {
      console.log('Alert received:', notification.request.content.body);
      // Show alert dialog
      Alert.alert(
        notification.request.content.title || '🚨 Alert',
        notification.request.content.body || ''
      );
    },
    // On notification tapped
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if (data?.type === 'message') {
        // Already on chat, just reload
        load();
      } else if (data?.type === 'alert') {
        // Could navigate to alerts screen if you have one
        console.log('Alert notification tapped');
      }
    }
  );

  // Register push token on mount
  useEffect(() => {
    const setupPushToken = async () => {
      const token = await getDevicePushToken();
      if (token && role && id) {
        await registerDeviceToken(token, id, role as 'conductor' | 'incharge', API_BASE);
      }
    };

    setupPushToken();
  }, [role, id]);

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

  const deleteMessage = async (msgIndex: number) => {
    const message = [...msgs].reverse()[msgIndex];
    if (!message) {
      Alert.alert('Error', 'Message not found');
      return;
    }

    if (message.user_id !== id) {
      Alert.alert('Error', 'You can only delete your own messages');
      return;
    }

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedMessageIndex(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);

              const deleteUrl = `${API_BASE}/api/chat/messages/${encodeURIComponent(message.user_id)}/${encodeURIComponent(message.ts)}`;
              
              const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requesting_user_id: id
                })
              });

              if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(
                  `Failed to delete (${response.status}): ${errorBody || response.statusText}`
                );
              }

              setMsgs((prevMsgs) =>
                prevMsgs.filter(
                  (msg) => !(msg.user_id === message.user_id && msg.ts === message.ts)
                )
              );
              
              setSelectedMessageIndex(null);
              Alert.alert('Success', 'Message deleted successfully');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert(
                'Error',
                `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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
            keyExtractor={(item, idx) => `${item.user_id}-${item.ts}`}
            inverted
            renderItem={({ item, index }) => (
              <Pressable
                onLongPress={() => setSelectedMessageIndex(item.user_id === ownId ? index : null)}
                delayLongPress={500}
                style={[
                  styles.msgRow,
                  item.user_id === ownId ? styles.msgRowOwn : styles.msgRowOther,
                ]}>
                <View
                  style={[
                    styles.bubble,
                    item.user_id === ownId ? styles.bubbleOwn : styles.bubbleOther,
                    selectedMessageIndex === index && styles.bubbleSelected,
                  ]}>
                  <Text style={styles.msgAuthor}>{resolveName(item)}</Text>
                  <Text style={styles.msgMeta}>{`${item.role} • ${item.user_id}`}</Text>
                  <Text style={styles.msgText}>{item.message}</Text>
                  <Text style={styles.msgTs}>{new Date(item.ts).toLocaleTimeString()}</Text>

                  {selectedMessageIndex === index && item.user_id === ownId && (
                    <Pressable
                      onPress={() => deleteMessage(index)}
                      disabled={deleting}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.deleteButtonPressed,
                      ]}>
                      <Text style={styles.deleteButtonText}>
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
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
  bubbleSelected: { backgroundColor: '#fff3cd', borderWidth: 2, borderColor: '#ffc107' },
  msgAuthor: { fontSize: 12, fontWeight: '600' },
  msgMeta: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  msgText: { color: '#111827' },
  msgTs: { fontSize: 10, color: '#6b7280', alignSelf: 'flex-end', marginTop: 4 },
  deleteButton: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#dc2626', borderRadius: 6, alignSelf: 'flex-start' },
  deleteButtonPressed: { opacity: 0.7 },
  deleteButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', paddingTop: 8, paddingHorizontal: 8, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, minHeight: 42, maxHeight: 100, backgroundColor: '#fff' },
});