/**
 * 感情の固定カテゴリ・軸定義（レポート集計用）。
 * 診断・推測ではなく、固定ルールの集計のみに使用する。
 */

import type { EmotionId } from '@/constants/emotions';

/** 感情カテゴリ：ポジティブ系 / 怒り系 / 悲しみ系 */
export type EmotionCategoryKey = 'positive' | 'anger' | 'sadness';

export const EMOTION_CATEGORIES: Record<EmotionCategoryKey, EmotionId[]> = {
  positive: ['happy'],
  anger: ['angry', 'irritated'],
  sadness: ['sad', 'lonely', 'anxious'],
};

export const EMOTION_CATEGORY_LABELS: Record<EmotionCategoryKey, string> = {
  positive: 'ポジティブ系',
  anger: '怒り系',
  sadness: '悲しみ系',
};

/** 高ぶり寄り / 落ち着き寄り */
export const HIGH_LOW_EMOTIONS: { high: EmotionId[]; low: EmotionId[] } = {
  high: ['angry', 'irritated', 'sad'],
  low: ['happy', 'anxious', 'lonely'],
};

export const HIGH_LOW_LABELS = { high: '高ぶり寄り', low: '落ち着き寄り' } as const;

/** 快 / 不快寄り */
export const PLEASANT_UNPLEASANT_EMOTIONS: { pleasant: EmotionId[]; unpleasant: EmotionId[] } = {
  pleasant: ['happy'],
  unpleasant: ['angry', 'irritated', 'sad', 'anxious', 'lonely'],
};

export const PLEASANT_UNPLEASANT_LABELS = { pleasant: '快', unpleasant: '不快' } as const;
