// Prefer env configuration, but keep a Vercel fallback for deployed builds.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://bsms-rn-app.vercel.app';
