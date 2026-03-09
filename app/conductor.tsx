
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Menu,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { API_BASE } from './config/api';

type Student = {
  student_id: string;
  name: string;
  seat: number | null;
  present: boolean;
  bus_no: number;
  is_temp?: boolean;
};

type BusInfo = {
  bus_no: number;
  route: string;
  driver?: string;
  driver_contact?: string;
  helper?: string;
  helper_contact?: string;
  conductor_id?: string;
  conductor_name?: string;
  vehicle_no?: string;
  capacity?: number;
};

export default function ConductorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const conductorId = useMemo(() => id ?? '', [id]);

  const [busNo, setBusNo] = useState<number | null>(null);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<string>('');
  const [alertMenuVisible, setAlertMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'alert' | 'attendance'>('attendance');
  const presetAlerts = [
    'भिमताल मार्ग पर सड़क बंद है',
    'मार्ग में भारी ट्रैफिक है',
    'बस 5 मिनट देरी से पहुँचेगी',
    'बस थोड़ी देर में रवाना होगी',
    'कृपया अपने आईडी कार्ड तैयार रखें',
    'सभी यात्री अपनी सीट पर बैठें',
  ];

  // Add passenger form
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerId, setPassengerId] = useState<string>('');
  const [ticketMode, setTicketMode] = useState<boolean>(true); // true = one-day

  async function resolveBus() {
    try {
      const res = await fetch(`${API_BASE}/api/conductor/${encodeURIComponent(conductorId)}`);
      if (res.ok) {
        const data = await res.json(); // { bus_no: number }
        setBusNo(data.bus_no);
        return data.bus_no;
      }
    } catch (e) {
      console.warn('Failed to fetch conductor assignment:', e);
      Alert.alert('Load error', 'Could not fetch conductor assignment. Using fallback bus mapping if available.');
    }
    const map: Record<string, number> = { C001: 1, C004: 4, C011: 11 };
    const fallbackBus = map[conductorId] ?? null;
    setBusNo(fallbackBus);
    return fallbackBus;
  }

  async function loadStudents(bus: number | null) {
    if (!bus) return;
    try {
      setLoading(true);
      // Fetch students
      const res = await fetch(`${API_BASE}/api/students?bus_no=${bus}`);
      const data = await res.json();
      setStudents(data);
      
      // Fetch bus info to get conductor and helper details
      const busRes = await fetch(`${API_BASE}/api/buses`);
      const busData = await busRes.json();
      const currentBus = busData.find((b: BusInfo) => b.bus_no === bus);
      if (currentBus) {
        setBusInfo(currentBus);
      }
    } catch (e) {
      console.warn('Failed to load students:', e);
      Alert.alert('Load error', 'Could not load bus or student details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const bus = await resolveBus();
      await loadStudents(bus);
    })();
  }, [conductorId]);

  async function markAttendance(student_id: string, present: boolean) {
    try {
      const res = await fetch(`${API_BASE}/api/conductor/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, present, conductor_id: conductorId }),
      });
      if (!res.ok) throw new Error('Attendance update failed');
      setStudents((prev) => prev.map((s) => (s.student_id === student_id ? { ...s, present } : s)));
      Alert.alert('Attendance updated', `${student_id} marked ${present ? 'present' : 'absent'}.`);
    } catch (e) {
      console.warn('Failed to update attendance:', e);
      Alert.alert('Attendance error', 'Failed to update attendance.');
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadStudents(busNo);
    setRefreshing(false);
  }

  async function sendHindiAlert() {
    if (!alertMsg.trim()) {
      Alert.alert('Missing alert', 'Hindi alert message is required.');
      return;
    }

    const payload = {
      conductor_id: conductorId,
      bus_no: busNo,
      message: alertMsg.trim(),
    };

    const endpoints = ['/api/conductor/alert', '/api/incharge/alert'];

    for (const endpoint of endpoints) {
      try {
        const body =
          endpoint === '/api/incharge/alert'
            ? JSON.stringify({ incharge_id: conductorId, message: alertMsg.trim() })
            : JSON.stringify(payload);

        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Alert request failed');
        }

        setAlertInfo('Hindi alert sent');
        setAlertMsg('');
        setTimeout(() => setAlertInfo(''), 2500);
        Alert.alert('Alert sent', 'Hindi push alert sent successfully.');
        return;
      } catch (e) {
        console.warn(`Failed to send conductor alert via ${endpoint}:`, e);
      }
    }

    setAlertInfo('Failed to send alert');
    setTimeout(() => setAlertInfo(''), 2500);
    Alert.alert('Alert error', 'Could not send Hindi alert. Check backend alert route.');
  }

  async function addPassenger() {
    if (!passengerName.trim()) {
      Alert.alert('Missing data', 'Enter passenger name before adding.');
      return;
    }

    try {
      const endpoint = ticketMode ? 'ticket' : 'add-student';
      const resp = await fetch(`${API_BASE}/api/conductor/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductor_id: conductorId,
          name: passengerName,
          student_id: passengerId || undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Failed to add passenger');
      }
      // Reset form
      setPassengerName('');
      setPassengerId('');
      setTicketMode(true);
      await loadStudents(busNo);
      Alert.alert(
        'Passenger added',
        ticketMode
          ? `${json?.student_id ?? passengerName} added as a one-day ticket.`
          : `${json?.student_id ?? passengerName} added to the bus list.`
      );
    } catch (e) {
      console.warn('Failed to add passenger:', e);
      Alert.alert('Add passenger error', e instanceof Error ? e.message : 'Failed to add passenger.');
    }
  }

  async function removeTicket(student_id: string) {
    try {
      const resp = await fetch(`${API_BASE}/api/conductor/ticket/${encodeURIComponent(student_id)}`, {
        method: 'DELETE',
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Failed to remove ticket');
      }
      await loadStudents(busNo);
      Alert.alert('Ticket removed', `${student_id} has been removed from today’s ticket list.`);
    } catch (e) {
      console.warn('Failed to remove ticket:', e);
      Alert.alert('Remove ticket error', e instanceof Error ? e.message : 'Failed to remove ticket.');
    }
  }

  if (!conductorId) {
    return (
      <View style={styles.centered}>
        <Text>Please navigate with a valid Conductor ID.</Text>
      </View>
    );
  }

  if (loading && busNo === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading conductor assignment…</Text>
      </View>
    );
  }

  if (!busNo) {
    return (
      <View style={styles.centered}>
        <Text>You are not assigned to any bus.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            कंडक्टर - बस {busNo}
          </Text>
          <Button
            icon="chat"
            mode="text"
            onPress={() => router.push((`/chat?role=conductor&id=${encodeURIComponent(conductorId)}&name=${encodeURIComponent(busInfo?.conductor_name || conductorId)}`) as any)}
          >
            चैट
          </Button>
          
          {/* Display Bus, Conductor and Helper Info */}
          {busInfo && (
            <View style={styles.infoSection}>
              {busInfo.route && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>मार्ग:</Text>
                  <Text style={styles.infoValue}>{busInfo.route}</Text>
                </View>
              )}
              {busInfo.vehicle_no && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>वाहन:</Text>
                  <Text style={styles.infoValue}>{busInfo.vehicle_no}</Text>
                </View>
              )}
              {busInfo.driver && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ड्राइवर:</Text>
                  <Text style={styles.infoValue}>
                    {busInfo.driver}
                    {busInfo.driver_contact ? ` (${busInfo.driver_contact})` : ''}
                  </Text>
                </View>
              )}
              {busInfo.helper && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>सहायक:</Text>
                  <Text style={styles.infoValue}>
                    {busInfo.helper}
                    {busInfo.helper_contact ? ` (${busInfo.helper_contact})` : ''}
                  </Text>
                </View>
              )}
              {busInfo.conductor_id && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>कंडक्टर आईडी:</Text>
                  <Text style={styles.infoValue}>{busInfo.conductor_id}</Text>
                </View>
              )}
              {busInfo.conductor_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>कंडक्टर:</Text>
                  <Text style={styles.infoValue}>{busInfo.conductor_name}</Text>
                </View>
              )}
            </View>
          )}

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.tabRow}>
            <Button
              mode={activeTab === 'attendance' ? 'contained' : 'outlined'}
              compact
              onPress={() => setActiveTab('attendance')}
            >
              उपस्थिति
            </Button>
            <Button
              mode={activeTab === 'alert' ? 'contained' : 'outlined'}
              compact
              onPress={() => setActiveTab('alert')}
            >
              सतर्कता
            </Button>
          </View>

          {activeTab === 'alert' ? (
            <View style={styles.tabPanel}>
              <Menu
                visible={alertMenuVisible}
                onDismiss={() => setAlertMenuVisible(false)}
                anchor={
                  <Button mode="outlined" onPress={() => setAlertMenuVisible(true)}>
                    {alertMsg || 'सतर्कता चुनें'}
                  </Button>
                }
              >
                {presetAlerts.map((preset) => (
                  <Menu.Item
                    key={preset}
                    onPress={() => {
                      setAlertMsg(preset);
                      setAlertMenuVisible(false);
                    }}
                    title={preset}
                  />
                ))}
              </Menu>
              <TextInput
                mode="outlined"
                label="चुनी गई सतर्कता"
                placeholder="अपना संदेश लिखें"
                value={alertMsg}
                onChangeText={setAlertMsg}
                multiline
                style={{ marginTop: 8 }}
                left={<TextInput.Icon icon="bullhorn" />}
              />
              <View style={styles.alertRow}>
                <Button mode="contained" onPress={sendHindiAlert}>
                  भेजें
                </Button>
                {alertInfo ? <Text style={styles.alertInfo}>{alertInfo}</Text> : null}
              </View>
            </View>
          ) : (
            <View style={styles.tabPanel}>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>यात्री जोड़ें</Text>
              <View style={styles.addRow}>
                <TextInput
                  mode="outlined"
                  label="नाम (आवश्यक)"
                  value={passengerName}
                  onChangeText={setPassengerName}
                  style={styles.flexField}
                />
                <TextInput
                  mode="outlined"
                  label="आईडी (वैकल्पिक)"
                  value={passengerId}
                  onChangeText={setPassengerId}
                  style={styles.flexField}
                />
              </View>
              <View style={styles.addRow2}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch value={ticketMode} onValueChange={setTicketMode} />
                  <Text>एक दिन की टिकट</Text>
                </View>
                <Button mode="contained" onPress={addPassenger}>जोड़ें</Button>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <Chip icon="account-group" style={styles.chip}>
                  आज कुल: {students.length}
                </Chip>
                <Button mode="outlined" onPress={refresh}>रीफ्रेश करें</Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {activeTab === 'attendance' ? (
        <FlatList
          data={students}
          keyExtractor={(item) => item.student_id}
          onRefresh={refresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Card.Content>
                <View style={styles.itemHeader}>
                  <Text variant="titleMedium">{item.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {item.is_temp ? <Chip icon="ticket-confirmation" style={styles.statusChip}>टिकट</Chip> : null}
                    <Chip icon={item.present ? 'check-circle' : 'close-circle'} style={styles.statusChip}>
                      {item.present ? 'उपस्थित' : 'अनुपस्थित'}
                    </Chip>
                  </View>
                </View>
                <Text>सीट: {item.seat ?? 'N/A'}</Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <Button
                    mode="contained"
                    onPress={() => markAttendance(item.student_id, true)}
                    disabled={item.present}
                  >
                    उपस्थित
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => markAttendance(item.student_id, false)}
                    disabled={!item.present}
                  >
                    अनुपस्थित
                  </Button>
                  {item.is_temp ? (
                    <Button mode="outlined" onPress={() => removeTicket(item.student_id)}>
                      टिकट हटाएँ
                    </Button>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16 },
  title: { marginBottom: 6 },
  chip: { borderRadius: 10 },
  item: { marginTop: 10, borderRadius: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { borderRadius: 10 },
  flexField: { flex: 1 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addRow2: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
  tabRow: { flexDirection: 'row', gap: 10 },
  tabPanel: { marginTop: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  alertInfo: { flex: 1, color: '#6b7280', fontSize: 12 },
  infoSection: { marginTop: 8, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontWeight: '600', width: 100, color: '#555' },
  infoValue: { flex: 1, color: '#333' },
});
