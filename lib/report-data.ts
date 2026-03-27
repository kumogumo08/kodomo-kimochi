import type { EmotionHistoryItem } from '@/lib/emotion-history';
import type { Emotion } from '@/constants/emotions';
import i18n from '@/lib/i18n';
import {
  getLocalDateKey,
  getLocalDateKeyFromDate,
  getDayKeysForPeriod,
  formatDateLabel,
  isDateKeyInRange,
  getPeriodRange,
  getMonthBlocks,
  parseLocalDateKey,
  type ReportPeriod,
} from '@/lib/date-utils';
import {
  EMOTION_CATEGORIES,
  EMOTION_CATEGORY_LABELS,
  HIGH_LOW_EMOTIONS,
  PLEASANT_UNPLEASANT_EMOTIONS,
  type EmotionCategoryKey,
} from '@/lib/emotion-categories';

export type { ReportPeriod };

export type StackedBarData = {
  legend: string[];
  data: number[][];
  barColors: string[];
};

export type ReportData = {
  period: ReportPeriod;
  periodLabel: string;
  total: number;
  pieData: Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }>;
  dailyLabels: string[];
  dailyCounts: number[];
  /** 積み上げ棒グラフ用（感情色で統一） */
  stackedBarData: StackedBarData;
  /** その期間で選ばれた感情の種類数 */
  emotionUniqueCount: number;
  /** 感情カテゴリ別件数（ポジティブ系/怒り系/悲しみ系） */
  categoryCounts: Record<EmotionCategoryKey, number>;
  /** 高ぶり寄り / 落ち着き寄り 件数 */
  highLowCounts: { high: number; low: number };
  /** 快 / 不快寄り 件数 */
  pleasantCounts: { pleasant: number; unpleasant: number };
  /** 前期間との比較（表示用） */
  previousPeriodLabel?: string;
  previousTotal?: number;
  diffFromPrevious?: number;
};

function getPeriodLabel(period: ReportPeriod): string {
  switch (period) {
    case 'thisWeek':
      return i18n.t('history.period.thisWeek');
    case 'lastWeek':
      return i18n.t('history.period.lastWeek');
    case 'thisMonth':
      return i18n.t('history.period.thisMonth');
    case 'lastMonth':
      return i18n.t('history.period.lastMonth');
    default:
      throw new Error(`Unsupported period for label: ${period}`);
  }
}

function getPreviousPeriod(period: ReportPeriod): ReportPeriod | null {
  switch (period) {
    case 'thisWeek':
      return 'lastWeek';
    case 'lastWeek':
      return null;
    case 'thisMonth':
      return 'lastMonth';
    case 'lastMonth':
      return null;
    case 'custom':
      return null;
  }
}

/**
 * 指定期間でフィルタし、ローカル日付キーで集計する。
 * selectedAt を唯一の基準に YYYY-MM-DD で集計。
 */
export function buildReportData(
  items: EmotionHistoryItem[],
  period: ReportPeriod,
  emotions: Emotion[]
): ReportData {
  if (period === 'custom') {
    throw new Error('buildReportData(period=custom) is not supported. Use buildReportDataForRange instead.');
  }
  const { startKey, endKey } = getPeriodRange(period);
  const dayKeys = getDayKeysForPeriod(period);

  const periodItems = items.filter((item) => {
    const key = getLocalDateKey(item.selectedAt);
    return isDateKeyInRange(key, startKey, endKey);
  });

  const byEmotion: Record<string, number> = {};
  emotions.forEach((e) => {
    byEmotion[e.id] = periodItems.filter((i) => i.emotionId === e.id).length;
  });

  const pieData = emotions
    .filter((e) => byEmotion[e.id] > 0)
    .map((e) => ({
      name: e.label,
      population: byEmotion[e.id],
      color: e.bgColor,
      legendFontColor: '#555',
      legendFontSize: 12,
    }));

  const isMonthPeriod = period === 'thisMonth' || period === 'lastMonth';
  let dailyLabels: string[];
  let dailyCounts: number[];
  let stackedBarData: StackedBarData;

  if (isMonthPeriod) {
    const blocks = getMonthBlocks(period);
    dailyLabels = blocks.map((b) => b.label);
    dailyCounts = blocks.map((b) =>
      periodItems.filter(
        (item) => isDateKeyInRange(getLocalDateKey(item.selectedAt), b.startKey, b.endKey)
      ).length
    );
    stackedBarData = {
      legend: emotions.map((e) => e.label),
      data: blocks.map((block) =>
        emotions.map(
          (e) =>
            periodItems.filter(
              (item) =>
                item.emotionId === e.id &&
                isDateKeyInRange(getLocalDateKey(item.selectedAt), block.startKey, block.endKey)
            ).length
        )
      ),
      barColors: emotions.map((e) => e.bgColor),
    };
  } else {
    dailyCounts = dayKeys.map((dateKey) =>
      periodItems.filter((item) => getLocalDateKey(item.selectedAt) === dateKey).length
    );
    dailyLabels = dayKeys.map(formatDateLabel);
    stackedBarData = {
      legend: emotions.map((e) => e.label),
      data: dayKeys.map((dateKey) =>
        emotions.map(
          (e) =>
            periodItems.filter(
              (item) =>
                getLocalDateKey(item.selectedAt) === dateKey && item.emotionId === e.id
            ).length
        )
      ),
      barColors: emotions.map((e) => e.bgColor),
    };
  }

  const emotionUniqueCount = emotions.filter((e) => byEmotion[e.id] > 0).length;

  const categoryCounts = (Object.keys(EMOTION_CATEGORIES) as EmotionCategoryKey[]).reduce(
    (acc, key) => {
      acc[key] = EMOTION_CATEGORIES[key].reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0);
      return acc;
    },
    {} as Record<EmotionCategoryKey, number>
  );

  const highLowCounts = {
    high: HIGH_LOW_EMOTIONS.high.reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0),
    low: HIGH_LOW_EMOTIONS.low.reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0),
  };

  const pleasantCounts = {
    pleasant: PLEASANT_UNPLEASANT_EMOTIONS.pleasant.reduce(
      (sum, id) => sum + (byEmotion[id] ?? 0),
      0
    ),
    unpleasant: PLEASANT_UNPLEASANT_EMOTIONS.unpleasant.reduce(
      (sum, id) => sum + (byEmotion[id] ?? 0),
      0
    ),
  };

  const result: ReportData = {
    period,
    periodLabel: getPeriodLabel(period),
    total: periodItems.length,
    pieData,
    dailyLabels,
    dailyCounts,
    stackedBarData,
    emotionUniqueCount,
    categoryCounts,
    highLowCounts,
    pleasantCounts,
  };

  const prevPeriod = getPreviousPeriod(period);
  if (prevPeriod) {
    const prevRange = getPeriodRange(prevPeriod);
    const prevItems = items.filter((item) => {
      const key = getLocalDateKey(item.selectedAt);
      return isDateKeyInRange(key, prevRange.startKey, prevRange.endKey);
    });
    result.previousPeriodLabel = getPeriodLabel(prevPeriod);
    result.previousTotal = prevItems.length;
    result.diffFromPrevious = result.total - prevItems.length;
  }

  return result;
}

function buildRangeDayKeys(startDate: Date, endDate: Date): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    keys.push(getLocalDateKeyFromDate(d));
  }
  return keys;
}

function formatRangeLabel(startKey: string, endKey: string): string {
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sy}/${pad(sm)}/${pad(sd)}〜${ey}/${pad(em)}/${pad(ed)}`;
}

/**
 * 任意の開始日・終了日でフィルタしたカスタム期間レポートを作成する。
 * 期間内はすべて日単位で集計し、月ブロック分割は行わない。
 */
export function buildReportDataForRange(
  items: EmotionHistoryItem[],
  startDate: Date,
  endDate: Date,
  emotions: Emotion[]
): ReportData {
  // 日付キーとしての開始・終了を決定（逆順指定された場合は入れ替える）
  let startKey = getLocalDateKeyFromDate(startDate);
  let endKey = getLocalDateKeyFromDate(endDate);
  if (startKey > endKey) {
    const tmp = startKey;
    startKey = endKey;
    endKey = tmp;
  }

  const dayKeys = buildRangeDayKeys(parseLocalDateKey(startKey), parseLocalDateKey(endKey));

  const periodItems = items.filter((item) => {
    const key = getLocalDateKey(item.selectedAt);
    return isDateKeyInRange(key, startKey, endKey);
  });

  const byEmotion: Record<string, number> = {};
  emotions.forEach((e) => {
    byEmotion[e.id] = periodItems.filter((i) => i.emotionId === e.id).length;
  });

  const pieData = emotions
    .filter((e) => byEmotion[e.id] > 0)
    .map((e) => ({
      name: e.label,
      population: byEmotion[e.id],
      color: e.bgColor,
      legendFontColor: '#555',
      legendFontSize: 12,
    }));

  const dailyCounts = dayKeys.map((dateKey) =>
    periodItems.filter((item) => getLocalDateKey(item.selectedAt) === dateKey).length
  );
  const dailyLabels = dayKeys.map(formatDateLabel);

  const stackedBarData: StackedBarData = {
    legend: emotions.map((e) => e.label),
    data: dayKeys.map((dateKey) =>
      emotions.map(
        (e) =>
          periodItems.filter(
            (item) =>
              getLocalDateKey(item.selectedAt) === dateKey && item.emotionId === e.id
          ).length
      )
    ),
    barColors: emotions.map((e) => e.bgColor),
  };

  const emotionUniqueCount = emotions.filter((e) => byEmotion[e.id] > 0).length;

  const categoryCounts = (Object.keys(EMOTION_CATEGORIES) as EmotionCategoryKey[]).reduce(
    (acc, key) => {
      acc[key] = EMOTION_CATEGORIES[key].reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0);
      return acc;
    },
    {} as Record<EmotionCategoryKey, number>
  );

  const highLowCounts = {
    high: HIGH_LOW_EMOTIONS.high.reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0),
    low: HIGH_LOW_EMOTIONS.low.reduce((sum, id) => sum + (byEmotion[id] ?? 0), 0),
  };

  const pleasantCounts = {
    pleasant: PLEASANT_UNPLEASANT_EMOTIONS.pleasant.reduce(
      (sum, id) => sum + (byEmotion[id] ?? 0),
      0
    ),
    unpleasant: PLEASANT_UNPLEASANT_EMOTIONS.unpleasant.reduce(
      (sum, id) => sum + (byEmotion[id] ?? 0),
      0
    ),
  };

  const result: ReportData = {
    period: 'custom',
    periodLabel: formatRangeLabel(startKey, endKey),
    total: periodItems.length,
    pieData,
    dailyLabels,
    dailyCounts,
    stackedBarData,
    emotionUniqueCount,
    categoryCounts,
    highLowCounts,
    pleasantCounts,
  };

  return result;
}
