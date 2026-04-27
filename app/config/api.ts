import Constants from 'expo-constants';

function deriveDevApiBase() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (!hostUri) return null;

  const host = String(hostUri).split(':')[0];
  if (!host) return null;

  return `http://${host}:3001`;
}

const envApiBase =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE;

export const API_BASE =
  envApiBase ||
  deriveDevApiBase() ||
  'https://bsms-rn-app.vercel.app';
