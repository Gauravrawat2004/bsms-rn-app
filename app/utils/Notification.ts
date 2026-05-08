import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Get the device's Expo push token
 * Only works on physical devices
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (!granted) {
      console.warn('⚠️  Notification permissions not granted');
      return null;
    }

    const configuredProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    const projectId = (Constants as any).easConfig?.projectId || configuredProjectId;
    if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
      console.warn('No valid EAS projectId found. Set expo.extra.eas.projectId in app.json.');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log('✅ Push token obtained:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(
  token: string,
  userId: string,
  role: 'conductor' | 'incharge',
  serverUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/api/device-token/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        userId,
        role,
        device_name: `${Platform.OS} device`,
        os: Platform.OS,
      }),
    });

    if (!response.ok) {
      console.error('Failed to register device token:', response.statusText);
      return false;
    }

    console.log('✅ Device token registered with backend');
    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
}

/**
 * Hook to setup all notification listeners
 */
export function usePushNotifications(
  onMessageReceived?: (notification: Notifications.Notification) => void,
  onAlertReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('📬 Notification received:', notification);

        const data = notification.request.content.data as Record<string, any>;

        // Route to appropriate handler
        if (data?.type === 'message') {
          console.log('💬 Chat message notification');
          onMessageReceived?.(notification);
        } else if (data?.type === 'alert') {
          console.log('🚨 Alert notification');
          onAlertReceived?.(notification);
        }
      }
    );

    // Listen for notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        console.log('👆 Notification tapped:', response);
        onNotificationTapped?.(response);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [onMessageReceived, onAlertReceived, onNotificationTapped]);
}

/**
 * Send local notification (for testing)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      badge: 1,
    },
    trigger: { seconds: 1 },
  });
}

/**
 * Get last notification async (when app launches from notification)
 */
export async function getLastNotificationAsync() {
  return await Notifications.getLastNotificationResponseAsync();
}
