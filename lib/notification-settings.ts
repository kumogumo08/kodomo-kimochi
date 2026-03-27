import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_SETTINGS_KEY = 'kodomo_kimochi_notification_settings_v1';
const NOTIFICATION_TITLE = '子供のきもち';
const NOTIFICATION_BODY = '今日の気持ちを記録してみよう';

export const MAX_NOTIFICATION_SETTINGS = 3;

export type NotificationSetting = {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string;
};

let initialized = false;

export async function initializeNotificationSystem(): Promise<void> {
  if (initialized) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  await Notifications.setNotificationChannelAsync('daily-reminders', {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  initialized = true;
}

function normalizeNotificationSetting(raw: unknown, index: number): NotificationSetting {
  const input = raw as Partial<NotificationSetting> | null;
  const hour =
    typeof input?.hour === 'number' && input.hour >= 0 && input.hour <= 23 ? Math.floor(input.hour) : 20;
  const minute =
    typeof input?.minute === 'number' && input.minute >= 0 && input.minute <= 59
      ? Math.floor(input.minute)
      : 0;

  return {
    id:
      typeof input?.id === 'string' && input.id.length > 0
        ? input.id
        : `notification_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: !!input?.enabled,
    hour,
    minute,
    notificationId: typeof input?.notificationId === 'string' ? input.notificationId : undefined,
  };
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_NOTIFICATION_SETTINGS).map((item, index) => normalizeNotificationSetting(item, index));
  } catch {
    return [];
  }
}

export async function saveNotificationSettings(settings: NotificationSetting[]): Promise<void> {
  await AsyncStorage.setItem(
    NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(settings.slice(0, MAX_NOTIFICATION_SETTINGS))
  );
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status;
}

export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

export async function cancelScheduledNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // no-op: already removed or invalid ID
  }
}

export async function syncNotificationSchedule(setting: NotificationSetting): Promise<NotificationSetting> {
  if (setting.notificationId) {
    await cancelScheduledNotification(setting.notificationId);
  }

  if (!setting.enabled) {
    const { notificationId: _removed, ...rest } = setting;
    return rest;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: NOTIFICATION_TITLE,
      body: NOTIFICATION_BODY,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: setting.hour,
      minute: setting.minute,
    },
  });

  return { ...setting, notificationId };
}
