/**
 * 開発用ダミーデータ生成。
 * __DEV__ 時のみ利用し、本番ビルドでは実行されない。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Emotion } from '@/constants/emotions';
import {
  getDayKeysThisWeek,
  getDayKeysLastWeek,
  getDayKeysThisMonth,
  getDayKeysLastMonth,
  getLocalDateKeyFromDate,
} from '@/lib/date-utils';
import type { EmotionHistoryItem } from '@/lib/emotion-history';
import { addEmotionHistoryBulk } from '@/lib/emotion-history';

const DEBUG_FLAG_KEY = 'kodomo_kimochi_debug_history_generated';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInDay(dateKey: string): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, day, randomInt(0, 23), randomInt(0, 59), 0, 0);
  return date.toISOString();
}

function pickRandomEmotion(emotions: Emotion[]): Pick<Emotion, 'id' | 'label'> {
  const e = emotions[randomInt(0, emotions.length - 1)];
  return { id: e.id, label: e.label };
}

/** 先々月の日付キー一覧（1日〜末日） */
function getDayKeysTwoMonthsAgo(): string[] {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const last = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  const keys: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    keys.push(getLocalDateKeyFromDate(new Date(d)));
  }
  return keys;
}

function generateItemsForPeriod(
  dayKeys: string[],
  minCount: number,
  maxCount: number,
  emotions: Emotion[]
): Omit<EmotionHistoryItem, 'id'>[] {
  if (dayKeys.length === 0) return [];
  const count = randomInt(minCount, maxCount);
  const items: Omit<EmotionHistoryItem, 'id'>[] = [];
  for (let i = 0; i < count; i++) {
    const dateKey = dayKeys[randomInt(0, dayKeys.length - 1)];
    const { id: emotionId, label } = pickRandomEmotion(emotions);
    items.push({
      emotionId,
      label,
      selectedAt: randomDateInDay(dateKey),
    });
  }
  return items;
}

/**
 * 検証用のダミー履歴を生成する。
 * - __DEV__ でない場合は何もしないで 0 を返す。
 * - 既に debug データが生成済み（フラグあり）の場合は何もしないで 0 を返す。
 * - 生成件数を console.log し、生成件数を返す。
 */
export async function generateDebugEmotionHistory(
  emotions: { id: string; label: string }[]
): Promise<number> {
  if (!__DEV__) {
    return 0;
  }

  const existing = await AsyncStorage.getItem(DEBUG_FLAG_KEY);
  if (existing === '1') {
    return 0;
  }

  const thisWeekKeys = getDayKeysThisWeek();
  const lastWeekKeys = getDayKeysLastWeek();
  const thisMonthKeys = getDayKeysThisMonth();
  const lastMonthKeys = getDayKeysLastMonth();
  const twoMonthsAgoKeys = getDayKeysTwoMonthsAgo();

  const all: Omit<EmotionHistoryItem, 'id'>[] = [
    ...generateItemsForPeriod(twoMonthsAgoKeys, 10, 20, emotions as Emotion[]),
    ...generateItemsForPeriod(lastMonthKeys, 15, 25, emotions as Emotion[]),
    ...generateItemsForPeriod(thisMonthKeys, 10, 20, emotions as Emotion[]),
    ...generateItemsForPeriod(lastWeekKeys, 3, 8, emotions as Emotion[]),
    ...generateItemsForPeriod(thisWeekKeys, 5, 10, emotions as Emotion[]),
  ];

  await addEmotionHistoryBulk(all);
  await AsyncStorage.setItem(DEBUG_FLAG_KEY, '1');

  return all.length;
}
