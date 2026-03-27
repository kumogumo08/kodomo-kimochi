import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CHILD_ID } from '@/lib/children';

const HISTORY_KEY = 'kodomo_kimochi_emotion_history_v1';
// ❌ 上限削除（履歴消失の原因）
// const MAX_ITEMS = 100;

// 将来的な安全装置（かなり大きく）
const MAX_ITEMS_SAFE = 5000;

export type EmotionHistoryItem = {
  id: string;
  emotionId: string;
  label: string;
  selectedAt: string;
  memo?: string;
  childId?: string;
};

function normalizeHistoryItem(item: EmotionHistoryItem): EmotionHistoryItem {
  return item.childId ? item : { ...item, childId: DEFAULT_CHILD_ID };
}

async function loadHistoryWithMigration(): Promise<EmotionHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  let list: EmotionHistoryItem[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }

  const normalized = list.map(normalizeHistoryItem);

  const requiresSave = normalized.some((item, idx) => item !== list[idx]);
  if (requiresSave) {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

function sortByDateDesc(list: EmotionHistoryItem[]) {
  return list.sort((a, b) => b.selectedAt.localeCompare(a.selectedAt));
}

// 保険：巨大化したときだけ制限（通常は発動しない）
function applySafetyLimit(list: EmotionHistoryItem[]) {
  if (list.length > MAX_ITEMS_SAFE) {
    return list.slice(0, MAX_ITEMS_SAFE);
  }
  return list;
}

export async function addEmotionToHistory(
  item: Omit<EmotionHistoryItem, 'id' | 'childId'>,
  childId: string = DEFAULT_CHILD_ID
): Promise<void> {
  const entry: EmotionHistoryItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    childId,
  };

  const list = await loadHistoryWithMigration();

  // バックアップ（重要）
  await AsyncStorage.setItem('history_backup', JSON.stringify(list));

  const scopedExisting = list.filter((h) => h.childId === childId);
  const otherChildren = list.filter((h) => h.childId !== childId);

  // 上限は childId 単位で適用する（他の子どもの履歴を巻き込まない）
  const mergedForChild = sortByDateDesc([entry, ...scopedExisting]);
  const safeForChild = applySafetyLimit(mergedForChild);

  const merged = sortByDateDesc([...safeForChild, ...otherChildren]);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
}

export async function addEmotionHistoryBulk(
  items: Omit<EmotionHistoryItem, 'id' | 'childId'>[],
  childId: string = DEFAULT_CHILD_ID
): Promise<void> {
  if (items.length === 0) return;

  const entries: EmotionHistoryItem[] = items.map((item, i) => ({
    ...item,
    id: `bulk_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`,
    childId,
  }));

  const list = await loadHistoryWithMigration();

  await AsyncStorage.setItem('history_backup', JSON.stringify(list));

  const scopedExisting = list.filter((h) => h.childId === childId);
  const otherChildren = list.filter((h) => h.childId !== childId);

  const mergedForChild = sortByDateDesc([...entries, ...scopedExisting]);
  const safeForChild = applySafetyLimit(mergedForChild);

  const merged = sortByDateDesc([...safeForChild, ...otherChildren]);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
}

export async function getEmotionHistory(options?: { childId?: string }): Promise<EmotionHistoryItem[]> {
  const list = await loadHistoryWithMigration();

  if (!options?.childId) return list;

  return list.filter((item) => item.childId === options.childId);
}

export async function removeEmotionFromHistory(id: string, childId?: string): Promise<void> {
  const list = await loadHistoryWithMigration();

  const next = list.filter((item) => {
    if (item.id !== id) return true;
    if (!childId) return false;
    return item.childId !== childId;
  });

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function removeAllEmotionHistoryByChildId(childId: string): Promise<void> {
  const list = await loadHistoryWithMigration();

  const next = list.filter((item) => item.childId !== childId);

  if (next.length === list.length) return;

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function updateEmotionHistoryMemo(
  id: string,
  memo?: string,
  childId?: string
): Promise<void> {
  const list = await loadHistoryWithMigration();

  const trimmedMemo = (memo ?? '').trim();

  const next = list.map((item) => {
    if (item.id !== id) return item;
    if (childId && item.childId !== childId) return item;

    if (!trimmedMemo) {
      const { memo: _omit, ...rest } = item;
      return rest;
    }

    return { ...item, memo: trimmedMemo };
  });

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function generateDummyEmotionHistoryOneYear(
  emotions: { id: string; label: string }[],
  childId: string = DEFAULT_CHILD_ID
): Promise<number> {
  if (!emotions || emotions.length === 0) return 0;

  const existing = await getEmotionHistory({ childId });

  const memoSamples: string[] = [
    '弟におもちゃを取られた',
    '眠くてイライラしていた',
    '保育園に行きたくないと言った',
    'おやつで機嫌がよくなった',
    'お友達と遊べてうれしかった',
    'お風呂を嫌がった',
    'パパと遊んで楽しそうだった',
    '思い通りにいかなくて泣いた',
  ];

  const now = new Date();
  const dummyItems: EmotionHistoryItem[] = [];

  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);

    const count = Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];

      const d = new Date(date);
      d.setHours(Math.random() * 24, Math.random() * 60, 0, 0);

      const selectedAt = d.toISOString();

      const memo = Math.random() < 0.4
        ? memoSamples[Math.floor(Math.random() * memoSamples.length)]
        : undefined;

      dummyItems.push({
        id: `dummy_${selectedAt}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        emotionId: emotion.id,
        label: emotion.label,
        selectedAt,
        memo,
        childId,
      });
    }
  }

  if (dummyItems.length === 0) return 0;

  const all = await loadHistoryWithMigration();

  await AsyncStorage.setItem('history_backup', JSON.stringify(all));

  const otherChildren = all.filter((h) => h.childId !== childId);

  // ダミー生成の影響は対象 childId のみ（他の子どもを巻き込まない）
  const mergedForChild = sortByDateDesc([...dummyItems, ...existing]);
  const safeForChild = applySafetyLimit(mergedForChild);

  const merged = sortByDateDesc([...safeForChild, ...otherChildren]);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));

  return dummyItems.length;
}