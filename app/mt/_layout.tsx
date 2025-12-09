
// app/mto/_layout.tsx  (optional - for consistent nested screens)
import { Stack } from 'expo-router';

export default function MTOLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
