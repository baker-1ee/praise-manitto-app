import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '칭찬 마니또',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

/** Expo 푸시 토큰들로 알림 발송 — 발신자 클라이언트에서 직접 호출 (베스트 에포트, 실패해도 던지지 않음) */
export async function sendPushNotifications(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
): Promise<void> {
  const validTokens = [...new Set(tokens.filter((t): t is string => !!t))];
  if (validTokens.length === 0) return;

  try {
    for (let i = 0; i < validTokens.length; i += EXPO_PUSH_CHUNK_SIZE) {
      const chunk = validTokens.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, sound: 'default' }))),
      });
      // Expo 푸시 API는 요청 자체가 잘못돼도 HTTP 200을 줄 수 있고,
      // 개별 발송 실패는 응답 body의 티켓 배열에만 담겨오므로 반드시 확인해야 함
      const json = await res.json();
      console.log('Expo 푸시 발송 응답', JSON.stringify(json));
    }
  } catch (e) {
    console.warn('푸시 알림 발송 실패', e);
  }
}
