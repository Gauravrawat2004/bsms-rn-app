
// app/index.tsx
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Snackbar,
  Text,
  TextInput
} from 'react-native-paper';

type Role = 'student' | 'faculty' | 'conductor' | 'mto' | 'incharge';

export default function Index() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState(''); // optional for demo
  const [snack, setSnack] = useState<{ visible: boolean; msg: string }>({
    visible: false,
    msg: '',
  });

  const heading = useMemo(() => 'UniBus Login', []);
  const subheading = useMemo(
    () => 'Enter your University ID to access the portal',
    []
  );

  function warn(msg: string) {
    setSnack({ visible: true, msg });
  }

  function roleFromId(raw: string): Role | null {
    const v = (raw || '').toLowerCase().trim();
    if (!v) return null;
    if (v.startsWith('s') || v.startsWith('std-') || v.startsWith('student-'))
      return 'student';
    if (v.startsWith('f') || v.startsWith('fac-') || v.startsWith('faculty-'))
      return 'faculty';
    if (v.startsWith('c') || v.startsWith('cond-') || v.startsWith('conductor-'))
      return 'conductor';
    if (v.startsWith('m') || v.startsWith('mto-')) return 'mto';
    if (v.startsWith('i') || v.startsWith('inc-') || v.startsWith('incharge-'))
      return 'incharge';
    return null;
  }

  function onLogin() {
    if (!id.trim()) return warn('Please enter your University ID');
    // Password is optional; keep the line below if you want to require it.
    if (!password.trim()) return warn('Please enter your password');

    const role = roleFromId(id);
    if (!role)
      return warn('Unknown ID format. Try S101 / F123 / C001 / mto-1 / inc-1');

    router.push({ pathname: `/${role}`, params: { id } });
  }

  function fillDemo(value: string) {
    setId(value);
    if (!password) setPassword('12345'); // demo default
  }

  const Logo = (
    <View style={styles.logoWrap}>
      {/*
        If you have a logo image, place it at /assets/unibus.png
        and replace Avatar.Icon with:
        <Image source={require('../assets/unibus.png')} style={styles.logo} resizeMode="contain" />
      */}
      <Avatar.Icon
        size={72}
        icon="bus"
        style={{ backgroundColor: '#f1f115ff' }}
        color="#0f172a"
      />
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.centerCol}>
        {Logo}

        <Text variant="headlineMedium" style={styles.heading}>
          {heading}
        </Text>
        <Text style={styles.subheading}>{subheading}</Text>

        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <TextInput
              mode="outlined"
              label="University ID"
              placeholder="e.g. S101, F123, C001, mto-1, inc-1"
              value={id}
              onChangeText={setId}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock" />}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={onLogin}
              style={styles.loginBtn}
              buttonColor="#0b1223" // dark navy like your screenshot
              textColor="#ffffff"
              icon="arrow-right"
            >
              Login
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.demoLabel}>DEMO CREDENTIALS</Text>
        <View style={styles.chipsRow}>
          <Chip
            icon="school"
            onPress={() => fillDemo('S101')}
            style={styles.chip}
            mode="outlined"
          >
            Student: S101
          </Chip>
          <Chip
            icon="account-tie"
            onPress={() => fillDemo('F123')}
            style={styles.chip}
            mode="outlined"
          >
            Faculty: F123
          </Chip>
          <Chip
            icon="account"
            onPress={() => fillDemo('C001')}
            style={styles.chip}
            mode="outlined"
          >
            Conductor: C001
          </Chip>
          <Chip
            icon="traffic-light"
            onPress={() => fillDemo('mto-1')}
            style={styles.chip}
            mode="outlined"
          >
            MTO: mto-1
          </Chip>
          <Chip
            icon="shield-account"
            onPress={() => fillDemo('inc-1')}
            style={styles.chip}
            mode="outlined"
          >
            Incharge: inc-1
          </Chip>
        </View>
      </View>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, msg: '' })}
        duration={2500}
      >
        {snack.msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  centerCol: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#11c6ccff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.06)' },
      default: {},
    }),
  },
  logo: { width: 64, height: 64 },
  heading: {
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    color: '#0f172a',
    marginTop: 6,
  },
  subheading: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 6,
    marginTop: 4,
    ...Platform.select({
      web: {
        boxShadow:
          '0 10px 25px rgba(0,0,0,0.06), 0 3px 8px rgba(0,0,0,0.04)',
      },
      default: {},
    }),
  },
  input: { marginBottom: 12 },
  loginBtn: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: '0 6px 0 rgba(0,0,0,0.25)' },
      default: {},
    }),
  },
  demoLabel: {
    marginTop: 16,
    color: '#94a3b8',
    fontFamily: 'Poppins_500Medium',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  chip: { borderRadius: 16 },
});
