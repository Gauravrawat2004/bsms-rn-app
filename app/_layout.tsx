
// app/_layout.tsx
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { ActivityIndicator, MD3LightTheme, PaperProvider, Text } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 20,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#111827',          // headings/icons
    background: '#f4f5f7ff',       // page bg (soft grey like screenshot)
    surface: '#dee0e3ff',          // card background
    onSurface: '#111827',
    outline: '#d1d5db',          // card borders
    secondary: '#1f2937',
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Ensure the web page body isn't white behind the app
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        document.body.style.backgroundColor = theme.colors.background;
      } catch {}
    }
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      {/* Subtle top-to-bottom tint, close to the example */}
      <LinearGradient
        colors={['#eef1f4ff', '#fbfbfbff']}
        style={{ flex: 1, minHeight: '100%' }}
      >
        {!fontsLoaded ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading fonts…</Text>
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="student" />
            <Stack.Screen name="faculty" />
            <Stack.Screen name="conductor" />
            <Stack.Screen name="mto" />
            <Stack.Screen name="incharge" />
          </Stack>
        )}
      </LinearGradient>
    </PaperProvider>
  );
}
