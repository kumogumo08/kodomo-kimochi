import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView, PanGestureHandler, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChildNameChips } from '@/components/ChildNameChips';
import { PremiumGate } from '@/components/PremiumGate';
import { useChild } from '@/contexts/ChildContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTranslation } from 'react-i18next';
import { getEmotions, getEmotionById } from '@/constants/emotions';
import {
  getLocalDateKey,
  getLocalDateKeyFromDate,
  getTodayKey,
  formatDateLabel,
} from '@/lib/date-utils';
import type { EmotionHistoryItem } from '@/lib/emotion-history';
import {
  getEmotionHistory,
  removeEmotionFromHistory,
  updateEmotionHistoryMemo,
} from '@/lib/emotion-history';
import {
  buildReportData,
  buildReportDataForRange,
  type ReportPeriod,
} from '@/lib/report-data';
import { EmotionCalendar } from '@/components/EmotionCalendar';

const EmotionReportCharts = lazy(() =>
  import('@/components/EmotionReportCharts').then((m) => ({ default: m.EmotionReportCharts }))
);

const SCREEN_BG = '#F5F5F5';
const CARD_BG = '#FFF';
const TITLE_COLOR = '#1a1a1a';
const MUTED_COLOR = '#555';
const HELP_BG = '#F0F4F8';
const BORDER_COLOR = 'rgba(0,0,0,0.06)';
const DELETE_BG = '#E53935';
const MAX_MEMO_LENGTH = 50;

type SkeletonRow = {
  type: 'skeleton';
  id: string;
};

function formatSelectedAt(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

const PERIODS: { key: ReportPeriod }[] = [
  { key: 'thisWeek' },
  { key: 'lastWeek' },
  { key: 'thisMonth' },
  { key: 'lastMonth' },
];

/** 過去日の折りたたみ時に1行だけ表示するサマリー行 */
type SummaryRow = { type: 'summary'; dateKey: string; count: number };

/** 直近2週間より前の「過去」セクションで表示する感情別件数行 */
type EmotionCountRow = { type: 'emotionCount'; emotionId: string; label: string; count: number };

type HistorySectionItem = EmotionHistoryItem | SummaryRow | EmotionCountRow | SkeletonRow;

function isSummaryRow(item: HistorySectionItem): item is SummaryRow {
  return (item as SummaryRow).type === 'summary';
}

function isEmotionCountRow(item: HistorySectionItem): item is EmotionCountRow {
  return (item as EmotionCountRow).type === 'emotionCount';
}

function isSkeletonRow(item: HistorySectionItem): item is SkeletonRow {
  return (item as SkeletonRow).type === 'skeleton';
}

type HistorySection = {
  dateKey: string;
  title: string;
  data: HistorySectionItem[];
  isToday: boolean;
  isPastSection?: boolean;
};

export default function HistoryScreen() {
  const router = useRouter();
  const { effectivePremium } = usePremium();
  const { children, selectedChildId, selectChild, selectedChild } = useChild();
  const { t } = useTranslation();
  const { t: tHist } = useTranslation('history');
  const emotionsForLang = getEmotions();
  const isFocused = useIsFocused();
  const selectedChildIdRef = useRef(selectedChildId);
  useEffect(() => {
    selectedChildIdRef.current = selectedChildId;
  }, [selectedChildId]);
  const loadRequestIdRef = useRef(0);

  const [items, setItems] = useState<EmotionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memoSavingId, setMemoSavingId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('thisWeek');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const [showRangeControls, setShowRangeControls] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');

  const selectedIndex = useMemo(
    () => children.findIndex((child) => child.id === selectedChildId),
    [children, selectedChildId]
  );

  const handleSwipe = async (translationX: number) => {
    if (!effectivePremium) return;
    if (children.length <= 1) return;
    if (selectedIndex < 0) return;

    const threshold = 36;
    if (translationX <= -threshold && selectedIndex < children.length - 1) {
      await selectChild(children[selectedIndex + 1].id);
      return;
    }
    if (translationX >= threshold && selectedIndex > 0) {
      await selectChild(children[selectedIndex - 1].id);
    }
  };

  const toggleSection = useCallback((dateKey: string) => {
    if (loadingRef.current) return;
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setItems([]);
    try {
      const list = await getEmotionHistory({ childId: selectedChildId });
      console.log('全履歴件数', list.length);
      if (list.length > 0) {
        console.log('最古データ', list[list.length - 1]);
      }
      if (requestId === loadRequestIdRef.current) {
        setItems(list);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (!isFocused) return;

    let cancelled = false;
    setLoading(true);
    setItems([]);
    setLoadError(null);
    setRefreshing(false);
    setExpandedSections(new Set());
    setEditingMemoId(null);
    setMemoDraft('');

    load()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('読み込みに失敗しました。時間をおいて再度お試しください。');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isFocused, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = useCallback(
    (id: string) => {
      const childIdAtStart = selectedChildIdRef.current;
      Alert.alert(tHist('deleteConfirmTitle'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: tHist('deleteConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            if (selectedChildIdRef.current !== childIdAtStart) return;
            await removeEmotionFromHistory(id, childIdAtStart);
            if (selectedChildIdRef.current !== childIdAtStart) return;
            await load();
          },
        },
      ]);
    },
    [load, t]
  );

  const startEditMemo = useCallback((item: EmotionHistoryItem) => {
    if (!effectivePremium) return;
    setEditingMemoId(item.id);
    setMemoDraft(item.memo ?? '');
  }, [effectivePremium]);

  const cancelEditMemo = useCallback(() => {
    setEditingMemoId(null);
    setMemoDraft('');
  }, []);

  const saveMemo = useCallback(
    async (id: string) => {
      const trimmed = memoDraft.trim();
      const childIdAtStart = selectedChildIdRef.current;

      if (loadingRef.current) return;
      setMemoSavingId(id);
      try {
        await updateEmotionHistoryMemo(id, trimmed || undefined, childIdAtStart);

        // childId が切り替わった後に UI だけ更新される状態を完全に防ぐ
        if (selectedChildIdRef.current !== childIdAtStart) return;

        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            if (item.childId !== childIdAtStart) return item;
            return trimmed ? { ...item, memo: trimmed } : { ...item, memo: undefined };
          })
        );

        setEditingMemoId(null);
        setMemoDraft('');
      } finally {
        setMemoSavingId((current) => (current === id ? null : current));
      }
    },
    [memoDraft]
  );

  const baseReportData =
    effectivePremium && !loading ? buildReportData(items, selectedPeriod, emotionsForLang) : null;

  const customReportData =
    effectivePremium &&
    !loading &&
    useCustomRange &&
    rangeStart &&
    rangeEnd
      ? buildReportDataForRange(items, rangeStart, rangeEnd, emotionsForLang)
      : null;

  const reportData = customReportData ?? baseReportData;

  const calendarLogs = useMemo(() => {
    if (effectivePremium) return items;
    const recentStart = new Date();
    recentStart.setHours(0, 0, 0, 0);
    recentStart.setDate(recentStart.getDate() - 13);
    const recentStartKey = getLocalDateKeyFromDate(recentStart);
    return items.filter((item) => getLocalDateKey(item.selectedAt) >= recentStartKey);
  }, [effectivePremium, items]);

  const canRenderReport =
    effectivePremium &&
    !!reportData &&
    typeof reportData.total === 'number' &&
    Number.isFinite(reportData.total) &&
    Array.isArray(reportData.dailyLabels) &&
    Array.isArray(reportData.stackedBarData?.data) &&
    Array.isArray(reportData.stackedBarData?.legend) &&
    Array.isArray(reportData.stackedBarData?.barColors);

  const sections = useMemo((): HistorySection[] => {
    const todayKey = getTodayKey();

    // 今日を含めて14日分を日別表示にし、それより前を「過去」セクションとしてまとめる
    const recentStart = new Date();
    recentStart.setHours(0, 0, 0, 0);
    recentStart.setDate(recentStart.getDate() - 13);
    const recentStartKey = getLocalDateKeyFromDate(recentStart);

    const pastItems: EmotionHistoryItem[] = [];
    const byDay = new Map<string, EmotionHistoryItem[]>();

    items.forEach((item) => {
      const key = getLocalDateKey(item.selectedAt);
      if (key < recentStartKey) {
        pastItems.push(item);
      } else {
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(item);
      }
    });

    byDay.forEach((list) => list.sort((a, b) => b.selectedAt.localeCompare(a.selectedAt)));
    const dayKeys = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

    const result: HistorySection[] = dayKeys.map((dateKey) => {
      const dayItems = byDay.get(dateKey)!;
      const isToday = dateKey === todayKey;
      const expanded = isToday || expandedSections.has(dateKey);
      const data: HistorySectionItem[] = expanded
        ? dayItems
        : [{ type: 'summary', dateKey, count: dayItems.length }];

      return {
        dateKey,
        title:
          dateKey === todayKey
            ? tHist('today')
            : tHist('dateCount', { date: formatDateLabel(dateKey), count: dayItems.length }),
        data,
        isToday,
      };
    });

    if (pastItems.length > 0) {
      pastItems.sort((a, b) => b.selectedAt.localeCompare(a.selectedAt));

      const byEmotion = new Map<string, number>();
      pastItems.forEach((item) => {
        byEmotion.set(item.emotionId, (byEmotion.get(item.emotionId) ?? 0) + 1);
      });

      const pastData: HistorySectionItem[] = emotionsForLang
      .filter((e) => (byEmotion.get(e.id) ?? 0) > 0)
      .map((e) => ({
        type: 'emotionCount' as const,
        emotionId: e.id,
        label: e.label,
        count: byEmotion.get(e.id) ?? 0,
      }));

      result.push({
        dateKey: 'past',
        title: tHist('pastTitle'),
        data: pastData,
        isToday: false,
        isPastSection: true,
      });
    }

    return result;
  }, [items, expandedSections, tHist, emotionsForLang]);

  const skeletonSections = useMemo((): HistorySection[] => {
    const makeRows = (prefix: string, count: number): SkeletonRow[] =>
      Array.from({ length: count }, (_, i) => ({
        type: 'skeleton',
        id: `${prefix}-${i}`,
      }));

    return [
      {
        dateKey: 'skeleton-today',
        title: tHist('today'),
        data: makeRows('today', 3),
        isToday: true,
      },
      {
        dateKey: 'skeleton-recent',
        title: tHist('recentTitle'),
        data: makeRows('recent', 3),
        isToday: false,
      },
      {
        dateKey: 'skeleton-past',
        title: tHist('pastTitle'),
        data: makeRows('past', 4),
        isToday: false,
        isPastSection: true,
      },
    ];
  }, [tHist]);

  const sectionsForRender = loading ? skeletonSections : sections;

  const listHeader = (
    <>
      <Text style={styles.title}>{tHist('title')}</Text>
      <View style={styles.currentChildRow}>
        <ChildNameChips
          childrenList={children}
          selectedChild={selectedChild}
          selectedChildId={selectedChildId}
          effectivePremium={effectivePremium}
          selectChild={selectChild}
        />
        {effectivePremium && children.length > 1 ? (
          <Text style={styles.swipeSwitchHint}>{tHist('swipeSwitchHint')}</Text>
        ) : null}
      </View>

            {/* 感情カレンダー：PremiumGate 内で表示 */}
      <View style={styles.calendarSection}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>{tHist('calendarTitle')}</Text>
          <View style={styles.sectionTitleUnderline} />
        </View>
        <PremiumGate
          featureName={tHist('calendarTitle')}
          description={tHist('calendarPremiumDescription')}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={MUTED_COLOR} />
            </View>
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>{tHist('empty')}</Text>
          ) : (
            <EmotionCalendar logs={calendarLogs} />
          )}
        </PremiumGate>
      </View>

      {/* 感情レポート：PremiumGate 内で期間指定・期間チップ・グラフをまとめて制御 */}
      <View style={styles.reportSection}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>{tHist('reportTitle')}</Text>
          <View style={styles.sectionTitleUnderline} />
        </View>
        <PremiumGate
          featureName={tHist('reportTitle')}
          description={tHist('reportPremiumDescription')}
        >
          <View>
            <View style={styles.rangeRow}>
              <Pressable
                style={styles.rangeButton}
                onPress={() => setShowRangeControls((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={tHist('rangeButtonA11y')}
              >
                <Text style={styles.rangeButtonText}>{tHist('rangeButton')}</Text>
              </Pressable>
              {useCustomRange && rangeStart && rangeEnd && (
                <Text style={styles.rangeSummary}>
                  {tHist('rangeSummary', {
                    start: formatDateOnly(rangeStart),
                    end: formatDateOnly(rangeEnd),
                  })}
                </Text>
              )}
            </View>
            {showRangeControls && (
              <View style={styles.rangeControls}>
                <View style={styles.rangeRowInner}>
                  <Pressable
                    style={styles.rangeField}
                    onPress={() => {
                      setShowStartPicker(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={tHist('startDateA11y')}
                  >
                    <Text style={styles.rangeFieldLabel}>{tHist('startDate')}</Text>
                    <Text style={styles.rangeFieldValue}>
                      {rangeStart ? formatDateOnly(rangeStart) : tHist('notSelected')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.rangeField}
                    onPress={() => {
                      setShowEndPicker(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={tHist('endDateA11y')}
                  >
                    <Text style={styles.rangeFieldLabel}>{tHist('endDate')}</Text>
                    <Text style={styles.rangeFieldValue}>
                      {rangeEnd ? formatDateOnly(rangeEnd) : tHist('notSelected')}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.rangeActions}>
                  <Pressable
                    style={styles.rangeSearchButton}
                    onPress={() => {
                      if (!rangeStart || !rangeEnd) {
                        setRangeError(tHist('rangeErrorSelectBoth'));
                        setUseCustomRange(false);
                        return;
                      }
                      const startKey = getLocalDateKeyFromDate(rangeStart);
                      const endKey = getLocalDateKeyFromDate(rangeEnd);
                      if (startKey > endKey) {
                        setRangeError(tHist('rangeErrorOrder'));
                        setUseCustomRange(false);
                        return;
                      }
                      setRangeError(null);
                      setUseCustomRange(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={tHist('rangeSearchButtonA11y')}
                  >
                    <Text style={styles.rangeSearchButtonText}>{tHist('search')}</Text>
                  </Pressable>
                  {useCustomRange && (
                    <Pressable
                      style={styles.rangeClearButton}
                      onPress={() => {
                        setUseCustomRange(false);
                        setRangeError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={tHist('rangeClearA11y')}
                    >
                      <Text style={styles.rangeClearButtonText}>{tHist('clear')}</Text>
                    </Pressable>
                  )}
                </View>
                {rangeError ? <Text style={styles.rangeError}>{rangeError}</Text> : null}
                {showStartPicker && (
                  <DateTimePicker
                    value={rangeStart ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                      if (event.type === 'dismissed') {
                        setShowStartPicker(false);
                        return;
                      }
                      if (date) {
                        setRangeStart(date);
                        setShowStartPicker(false);
                      }
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    value={rangeEnd ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                      if (event.type === 'dismissed') {
                        setShowEndPicker(false);
                        return;
                      }
                      if (date) {
                        setRangeEnd(date);
                        setShowEndPicker(false);
                      }
                    }}
                  />
                )}
              </View>
            )}

            {!loading ? (
              <View style={styles.periodRow}>
                {PERIODS.map(({ key }) => {
                  const label = tHist(`period.${key}`);
                  return (
                    <Pressable
                      key={key}
                      style={[styles.periodChip, selectedPeriod === key && styles.periodChipSelected]}
                      onPress={() => {
                        setSelectedPeriod(key);
                        setUseCustomRange(false);
                        setRangeError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedPeriod === key }}
                      accessibilityLabel={label}>
                      <Text
                        style={[styles.periodChipText, selectedPeriod === key && styles.periodChipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {loading ? (
              <View style={styles.reportPlaceholder}>
                <ActivityIndicator size="small" color={MUTED_COLOR} />
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.reportEmpty}>{tHist('reportEmpty')}</Text>
            ) : !canRenderReport ? (
              <Text style={styles.reportEmpty}>{tHist('reportErrorData')}</Text>
            ) : reportData && reportData.total === 0 ? (
              <Text style={styles.reportEmpty}>{tHist('reportEmptyForPeriod')}</Text>
            ) : canRenderReport && reportData ? (
              <Suspense
                fallback={
                  <View style={styles.reportPlaceholder}>
                    <ActivityIndicator size="small" color={MUTED_COLOR} />
                  </View>
                }>
                <EmotionReportCharts reportData={reportData} />
              </Suspense>
            ) : null}
          </View>
        </PremiumGate>
      </View>

      {/* 履歴一覧ヘッダ末尾：ロード中 or 0件時はここで表示 */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={MUTED_COLOR} />
        </View>
      ) : loadError ? (
        <Text style={styles.errorText}>{loadError}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>{tHist('empty')}</Text>
      ) : null}

    </>
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <PanGestureHandler
          enabled={effectivePremium && editingMemoId === null && children.length > 1}
          onEnded={async (event: any) => {
            await handleSwipe(event.nativeEvent.translationX);
          }}
          activeOffsetX={[-12, 12]}
          failOffsetY={[-10, 10]}>
          <View style={styles.gestureWrap}>
            <View
              style={[styles.sectionListWrapper, loading && styles.sectionListWrapperDim]}
              pointerEvents={loading ? 'none' : 'auto'}>
              <SectionList
          style={styles.container}
          contentContainerStyle={styles.content}
          sections={sectionsForRender}
          keyExtractor={(item) =>
            isSkeletonRow(item)
              ? `skeleton-${item.id}`
              : isSummaryRow(item)
                ? `summary-${item.dateKey}`
                : isEmotionCountRow(item)
                  ? `past-${item.emotionId}`
                  : item.id
          }
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={listHeader}
          renderSectionHeader={({ section }) => {
            if (loading) {
              return (
                <View style={styles.sectionHeaderSkeletonWrap}>
                  <View style={styles.sectionHeaderSkeletonBar} />
                </View>
              );
            }
            if (section.isPastSection) {
              return <Text style={styles.sectionHeader}>{section.title}</Text>;
            }
            const isExpanded =
              section.data.length > 0 &&
              !isSummaryRow(section.data[0]);
            if (section.isToday) {
              return <Text style={styles.sectionHeader}>{section.title}</Text>;
            }
            if (isExpanded) {
              return (
                <Pressable
                  style={styles.sectionHeaderPressable}
                  onPress={() => toggleSection(section.dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={tHist('sectionCollapseA11y', { title: section.title })}>
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                  <Text style={styles.sectionHeaderChevron}>▲</Text>
                </Pressable>
              );
            }
            return <Text style={styles.sectionHeader}>{section.title}</Text>;
          }}
          renderItem={({ item, section }) =>
            isSkeletonRow(item) ? (
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonThumb} />
                <View style={styles.skeletonTextBlock}>
                  <View style={styles.skeletonLine} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                </View>
              </View>
            ) : isSummaryRow(item) ? (
              <Pressable
                style={({ pressed }) => [styles.summaryRow, pressed && styles.rowPressed, loading && styles.disabledRow]}
                onPress={() => toggleSection(item.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={tHist('summaryExpandA11y', {
                  date: formatDateLabel(item.dateKey),
                  count: item.count,
                })}
                accessibilityState={{ expanded: expandedSections.has(item.dateKey) }}>
                <Text style={styles.summaryRowText}>
                  {tHist('summaryText', {
                    date: formatDateLabel(item.dateKey),
                    count: item.count,
                  })}
                </Text>
                <Text style={styles.summaryRowChevron}>▼</Text>
              </Pressable>
            ) : isEmotionCountRow(item) ? (
              <View style={styles.emotionCountRow}>
                <Text style={styles.emotionCountLabel}>{item.label}</Text>
                <Text style={styles.emotionCountValue}>
                  {tHist('countItems', { count: item.count })}
                </Text>
              </View>
            ) : (
              <Swipeable
                renderRightActions={() => (
                  <Pressable
                    style={styles.deleteAction}
                    onPress={() => handleDelete(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={tHist('deleteAction')}>
                    <Text style={styles.deleteActionText}>{tHist('deleteAction')}</Text>
                  </Pressable>
                )}
                friction={2}
                rightThreshold={40}>
                <HistoryRow
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/emotion/[id]',
                      params: { id: item.emotionId },
                    })
                  }
                  onPressMemo={() => startEditMemo(item)}
                  isEditingMemo={editingMemoId === item.id}
                    isMemoSaving={memoSavingId === item.id}
                  t={tHist}
                  memoDraft={memoDraft}
                  onChangeMemoDraft={setMemoDraft}
                  onSaveMemo={() => saveMemo(item.id)}
                  onCancelMemo={cancelEditMemo}
                  canUseMemo={effectivePremium}
                />
              </Swipeable>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={null}
          />
            </View>
          </View>
        </PanGestureHandler>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function HistoryRow({
  item,
  onPress,
  onPressMemo,
  isEditingMemo,
  isMemoSaving,
  memoDraft,
  onChangeMemoDraft,
  onSaveMemo,
  onCancelMemo,
  canUseMemo,
  t,
}: {
  item: EmotionHistoryItem;
  onPress: () => void;
  onPressMemo: () => void;
  isEditingMemo: boolean;
  isMemoSaving: boolean;
  memoDraft: string;
  onChangeMemoDraft: (v: string) => void;
  onSaveMemo: () => void;
  onCancelMemo: () => void;
  canUseMemo: boolean;
  t: (key: string, options?: any) => string;
}) {
  const emotion = getEmotionById(item.emotionId);

  return (
    <View>
      <View style={styles.rowContainer}>
        <Pressable
          style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
          onPress={onPress}>
          {emotion ? (
            <View style={[styles.thumbWrap, { backgroundColor: emotion.bgColor }]}>
              <Image source={emotion.image} style={styles.thumb} contentFit="contain" />
            </View>
          ) : (
            <View style={[styles.thumbWrap, styles.thumbPlaceholder]} />
          )}

          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{emotion?.label ?? item.label}</Text>
            <Text style={styles.rowDate}>{formatSelectedAt(item.selectedAt)}</Text>

            {canUseMemo && item.memo ? (
              <Text style={styles.rowMemo}>
                {t('memo')}: {item.memo}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {canUseMemo ? (
          <Pressable onPress={onPressMemo} style={[styles.memoButton, isMemoSaving && styles.disabledRow]} disabled={isMemoSaving}>
            <Text style={styles.memoButtonText}>
              {item.memo ? t('memoEdit') : t('memo')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {canUseMemo && isEditingMemo && (
        <View style={styles.memoEditor}>
          <TextInput
            style={styles.memoInput}
            value={memoDraft}
            placeholder={t('memoPlaceholder')}
            placeholderTextColor="#999"
            onChangeText={(t) => onChangeMemoDraft(t.slice(0, MAX_MEMO_LENGTH))}
            maxLength={MAX_MEMO_LENGTH}
          />

          <View style={styles.memoEditorFooter}>
            <Text style={styles.memoCounter}>
              {memoDraft.length} / {MAX_MEMO_LENGTH}
            </Text>

            <View style={styles.memoButtons}>
              <Pressable
                onPress={onCancelMemo}
                style={[styles.memoCancelButton, isMemoSaving && styles.disabledRow]}
                disabled={isMemoSaving}>
                <Text style={styles.memoCancelText}>
                  {t('memoCancel')}
                </Text>
              </Pressable>

              <Pressable
                onPress={onSaveMemo}
                style={[styles.memoSaveButton, isMemoSaving && styles.memoSaveButtonDisabled]}
                disabled={isMemoSaving}>
                {isMemoSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.memoSaveText}>{t('memoSave')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  gestureWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TITLE_COLOR,
    marginBottom: 12,
  },
  currentChildRow: {
    marginBottom: 20,
    gap: 8,
  },
  swipeSwitchHint: {
    fontSize: 12,
    color: MUTED_COLOR,
    lineHeight: 17,
  },
  helpSection: {
    backgroundColor: HELP_BG,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  helpChevron: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginRight: 8,
  },
  helpHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: TITLE_COLOR,
  },
  helpBodyWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  helpBody: {
    fontSize: 14,
    lineHeight: 22,
    color: MUTED_COLOR,
    marginBottom: 16,
  },
  aboutSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  aboutHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 13,
    lineHeight: 20,
    color: MUTED_COLOR,
  },
  sectionTitleWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.4,
  },
  sectionTitleUnderline: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#22A6F2',
    marginTop: 6,
  },
  reportSection: {
    marginTop: 30,
    marginBottom: 28,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginHorizontal: -4,
  },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: HELP_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  periodChipSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED_COLOR,
  },
  periodChipTextSelected: {
    color: '#FFF',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: HELP_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED_COLOR,
  },
  rangeSummary: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginLeft: 8,
    flexShrink: 1,
    textAlign: 'right',
  },
  rangeControls: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: HELP_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rangeRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeField: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 6,
  },
  rangeFieldLabel: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginBottom: 4,
  },
  rangeFieldValue: {
    fontSize: 14,
    color: TITLE_COLOR,
  },
  rangeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rangeSearchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    marginRight: 8,
  },
  rangeSearchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  rangeClearButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFF',
  },
  rangeClearButtonText: {
    fontSize: 12,
    color: MUTED_COLOR,
  },
  rangeError: {
    marginTop: 6,
    fontSize: 12,
    color: '#D32F2F',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  sectionHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderChevron: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginLeft: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  summaryRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: TITLE_COLOR,
  },
  summaryRowChevron: {
    fontSize: 12,
    color: MUTED_COLOR,
  },
  emotionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emotionCountLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TITLE_COLOR,
  },
  emotionCountValue: {
    fontSize: 14,
    color: MUTED_COLOR,
  },
  reportPlaceholder: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  reportEmpty: {
    fontSize: 14,
    color: MUTED_COLOR,
    textAlign: 'center',
    paddingVertical: 24,
  },
  reportCountBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  reportCountLabel: {
    fontSize: 14,
    color: MUTED_COLOR,
    marginBottom: 8,
  },
  reportCountValue: {
    fontSize: 36,
    fontWeight: '800',
    color: TITLE_COLOR,
  },
  reportSubHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: TITLE_COLOR,
    marginBottom: 10,
  },
  chartWrap: {
    marginBottom: 24,
  },
  listSection: {
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMemo: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED_COLOR,
  },
  memoButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memoButtonText: {
    fontSize: 12,
    color: '#0a7ea4',
  },
  memoEditor: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#FFF',
  },
  memoEditorFooter: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoCounter: {
    fontSize: 11,
    color: MUTED_COLOR,
  },
  memoButtons: {
    flexDirection: 'row',
  },
  memoCancelButton: {
    marginRight: 8,
  },
  memoCancelText: {
    fontSize: 12,
    color: MUTED_COLOR,
  },
  memoSaveButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  memoSaveButtonDisabled: {
    opacity: 0.75,
  },
  disabledRow: {
    opacity: 0.6,
  },
  memoSaveText: {
    color: '#FFF',
    fontSize: 12,
  },
  sectionListWrapper: {
    flex: 1,
  },
  sectionListWrapperDim: {
    opacity: 0.65,
  },
  sectionHeaderSkeletonWrap: {
    paddingHorizontal: 0,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderSkeletonBar: {
    height: 18,
    width: 140,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    opacity: 0.9,
  },
  skeletonThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginRight: 14,
  },
  skeletonTextBlock: {
    flex: 1,
  },
  skeletonLine: {
    height: 14,
    width: '80%',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '55%',
  },
  calendarSection: {
    marginTop: 8,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: MUTED_COLOR,
    textAlign: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 18,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 10,
    backgroundColor: DELETE_BG,
    borderRadius: 12,
  },
  deleteActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 14,
  },
  thumbPlaceholder: {
    backgroundColor: '#E8E8E8',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TITLE_COLOR,
  },
  rowDate: {
    fontSize: 13,
    color: MUTED_COLOR,
    marginTop: 2,
  },
});
