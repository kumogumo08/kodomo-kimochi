/**
 * 日付まわりをローカルタイムゾーンで統一する。
 * 集計キーは YYYY-MM-DD、表示用は M/D などに変換する。
 */

/** ISO 文字列からローカル日付のキー YYYY-MM-DD を返す（集計・比較用） */
export function getLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return getLocalDateKeyFromDate(d);
}

/** Date からローカル日付キー YYYY-MM-DD */
export function getLocalDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 表示用ラベル（例: 3/8） */
export function formatDateLabel(dateKey: string): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  return `${m}/${day}`;
}

/** 今日のローカル日付キー */
export function getTodayKey(): string {
  return getLocalDateKeyFromDate(new Date());
}

/** 今日から n 日前の日付キー */
export function getDateKeyOffsetDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return getLocalDateKeyFromDate(d);
}

/** 直近14日より前の境界（このキーより前は「過去」セクション）。今日・直近14日以外。 */
export function getCutoffKeyForPast(): string {
  return getDateKeyOffsetDays(-14);
}

export type MonthBlock = { label: string; startKey: string; endKey: string };

/** 月を4ブロックに分ける（1〜7日、8〜14日、15〜21日、22日〜末日）。今月・先月のレポート用。 */
export function getMonthBlocks(period: 'thisMonth' | 'lastMonth'): MonthBlock[] {
  const today = new Date();
  const ref =
    period === 'thisMonth' ? today : new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const m = pad(month + 1);

  const blocks: MonthBlock[] = [
    { label: '1〜7日', startKey: `${year}-${m}-01`, endKey: `${year}-${m}-07` },
    { label: '8〜14日', startKey: `${year}-${m}-08`, endKey: `${year}-${m}-14` },
    { label: '15〜21日', startKey: `${year}-${m}-15`, endKey: `${year}-${m}-21` },
    {
      label: '22日〜末日',
      startKey: `${year}-${m}-22`,
      endKey: `${year}-${m}-${pad(lastDay)}`,
    },
  ];
  return blocks;
}

/** 直近7日分の日付キー [今日-6, 今日-5, ..., 今日] */
export function getDayKeysThisWeek(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    keys.push(getDateKeyOffsetDays(-i));
  }
  return keys;
}

/** その前の7日分 [今日-13, ..., 今日-7] */
export function getDayKeysLastWeek(): string[] {
  const keys: string[] = [];
  for (let i = 13; i >= 7; i--) {
    keys.push(getDateKeyOffsetDays(-i));
  }
  return keys;
}

/** 今月の日付キー一覧（1日〜今日まで） */
export function getDayKeysThisMonth(): string[] {
  const today = new Date();
  const keys: string[] = [];
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
    keys.push(getLocalDateKeyFromDate(new Date(d)));
  }
  return keys;
}

/** 先月の日付キー一覧（1日〜末日） */
export function getDayKeysLastMonth(): string[] {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const last = new Date(today.getFullYear(), today.getMonth(), 0);
  const keys: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    keys.push(getLocalDateKeyFromDate(new Date(d)));
  }
  return keys;
}

export type ReportPeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

/** YYYY-MM-DD 形式のローカル日付キーから Date を生成する（タイムゾーンに依存しない） */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 期間に対応する日付キー配列（グラフの順序） */
export function getDayKeysForPeriod(period: ReportPeriod): string[] {
  switch (period) {
    case 'thisWeek':
      return getDayKeysThisWeek();
    case 'lastWeek':
      return getDayKeysLastWeek();
    case 'thisMonth':
      return getDayKeysThisMonth();
    case 'lastMonth':
      return getDayKeysLastMonth();
    case 'custom':
      // カスタム期間は別関数で日付キーを組み立てるため、ここでは空配列を返す
      return [];
  }
}

/** dateKey が startKey 以上 endKey 以下か（文字列比較で OK） */
export function isDateKeyInRange(dateKey: string, startKey: string, endKey: string): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

/** 期間の開始・終了キー（その期間に含まれる日付の範囲） */
export function getPeriodRange(period: ReportPeriod): { startKey: string; endKey: string } {
  const keys = getDayKeysForPeriod(period);
  if (keys.length === 0) return { startKey: '', endKey: '' };
  return { startKey: keys[0], endKey: keys[keys.length - 1] };
}
