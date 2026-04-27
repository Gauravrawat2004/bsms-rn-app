import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/**
 * Configure notification behavior
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Get the device push token for this device
 * Returns null if device is not compatible or token cannot be obtained
 */
export async function getDevicePushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('No EAS projectId found in app.json');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    return token;
  } catch (error) {
    console.error('Error getting device push token:', error);
    return null;
  }
}

/**
 * Register this device's push token with the backend server
 * @param token - The expo push token
 * @param userId - User ID (conductor_id or incharge_id)
 * @param role - User role ('conductor' or 'incharge')
 * @param serverUrl - Backend server URL
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
        device_name: Device.deviceName || 'Unknown Device',
        os: Device.osName || 'Unknown',
      }),
    });

    if (!response.ok) {
      console.error('Failed to register device token:', response.statusText);
      return false;
    }

    console.log('Device token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
}

/**
 * Listen for incoming notifications
 * @param callback - Function called when notification is received
 */
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void
) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
}

/**
 * Listen for notification responses (when user taps notification)
 * @param callback - Function called when user responds to notification
 */
export function onNotificationResponseReceived(
  callback: (response: Notifications.NotificationResponse) => void
) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}

/**
 * Request notification permissions
 * Must be called before using notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (!granted) {
      console.warn('Notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}
