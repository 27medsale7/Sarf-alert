import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL = 'rates';

// عشان الإشعار يظهر حتى والتطبيق مفتوح
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'تنبيهات أسعار العملات',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function isAllowed(p) {
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function hasPermission() {
  return isAllowed(await Notifications.getPermissionsAsync());
}

export async function requestPermission() {
  await ensureChannel(); // أندرويد 13+ محتاج القناة قبل طلب الإذن
  if (await hasPermission()) return true;
  return isAllowed(await Notifications.requestPermissionsAsync());
}

export async function sendNotification(title, body) {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}
