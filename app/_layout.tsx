// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="student" />
      <Stack.Screen name="conductor" />
      <Stack.Screen name="mto" />
      <Stack.Screen name="incharge" />
      <Stack.Screen name="faculty" />
    </Stack>
  );
}