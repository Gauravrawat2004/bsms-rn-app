# BSMS Deployment

## Backend on Vercel

This repo now has a Vercel entrypoint at `api/index.js` and routes all requests to the Express app in `server/server.js`.

Set these environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Before deploying, run `SUPABASE_SETUP.sql` in the Supabase SQL editor.

Important: Vercel does not provide persistent writable local files. The backend must use Supabase for durable data before the APK can fully run without your laptop.

## APK Build

Set the deployed backend URL when building:

```bash
EXPO_PUBLIC_API_URL=https://your-vercel-app.vercel.app eas build -p android --profile preview
```

The `preview` EAS profile is configured to produce an APK.

## Push Notifications

Replace `YOUR_EAS_PROJECT_ID` in `app.json` with the real Expo/EAS project id before building.
