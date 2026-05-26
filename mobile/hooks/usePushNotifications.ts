import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure how notifications appear when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators don't get push tokens

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'YachtOps',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function savePushToken(userId: string, token: string) {
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
}

export async function sendWorklistPublishedNotification(params: {
  vesselId: string;
  department: string;
  date: string;
  publisherName: string;
}) {
  // Fetch push tokens for all crew in this vessel + department
  const { data: profiles } = await supabase
    .from('profiles')
    .select('push_token, full_name, department')
    .eq('vessel_id', params.vesselId)
    .eq('department', params.department)
    .not('push_token', 'is', null);

  if (!profiles || profiles.length === 0) return;

  const tokens = profiles
    .map((p: { push_token: string | null }) => p.push_token)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) return;

  // Send via Expo Push API (client-side, no server required)
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title: 'Worklist published',
    body: `${params.publisherName} published today's ${params.department} worklist`,
    data: { vesselId: params.vesselId, department: params.department, date: params.date },
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  }).catch(err => console.warn('[push] send failed:', err?.message));
}

export function usePushNotifications(userId: string | undefined) {
  const notifListener  = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Register and persist token
    registerForPushNotifications().then(token => {
      if (token) savePushToken(userId, token).catch(() => {});
    });

    // Foreground notification received
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[push] received:', notification.request.content.title);
    });

    // User tapped the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[push] tapped:', response.notification.request.content.data);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
