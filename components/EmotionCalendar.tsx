import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getEmotionById } from '@/constants/emotions';
import type { EmotionHistoryItem } from '@/lib/emotion-history';
import {
  getLocalDateKeyFromDate,
  parseLocalDateKey,
} from '@/lib/date-utils';

type EmotionLogForCalendar = EmotionHistoryItem & {
  dateKey: string;
  timeLabel: string;
};

type GroupedLogsByDate = Record<string, EmotionLogForCalendar[]>;

type EmotionCalendarProps = {
  logs: EmotionHistoryItem[];
};

function buildGroupedLogs(logs: EmotionHistoryItem[]): GroupedLogsByDate {
  const result: GroupedLogsByDate = {};
  logs.forEach((item) => {
    const d = new Date(item.selectedAt);
    const dateKey = getLocalDateKeyFromDate(d);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const timeLabel = `${h}:${m}`;
    const withMeta: EmotionLogForCalendar = { ...item, dateKey, timeLabel };
    if (!result[dateKey]) result[dateKey] = [];
    result[dateKey].push(withMeta);
  });
  Object.keys(result).forEach((key) => {
    result[key].sort(
      (a, b) => new Date(b.selectedAt).getTime() - new Date(a.selectedAt).getTime()
    );
  });
  return result;
}

export function EmotionCalendar({ logs }: EmotionCalendarProps) {
  const { t } = useTranslation();
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const weekdays = useMemo(
    () => t('emotionCalendar.weekdays', { returnObjects: true }) as string[],
    [t]
  );

  const grouped = useMemo(() => buildGroupedLogs(logs), [logs]);

  const days = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const cells: { dateKey: string; day: number; inMonth: boolean }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ dateKey: `prev-${i}`, day: 0, inMonth: false });
    }

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const dateKey = getLocalDateKeyFromDate(date);
      cells.push({ dateKey, day: d, inMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const idx = cells.length;
      cells.push({ dateKey: `next-${idx}`, day: 0, inMonth: false });
    }

    return cells;
  }, [monthDate]);

  const handlePrevMonth = () => {
    setSelectedDateKey(null);
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDateKey(null);
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = t('emotionCalendar.monthLabel', {
    year: monthDate.getFullYear(),
    month: monthDate.getMonth() + 1,
  });

  const selectedLogs: EmotionLogForCalendar[] =
    selectedDateKey && !selectedDateKey.startsWith('prev-') && !selectedDateKey.startsWith('next-')
      ? grouped[selectedDateKey] ?? []
      : [];

  const handleSelectDate = (dateKey: string) => {
    if (dateKey.startsWith('prev-') || dateKey.startsWith('next-')) return;
    setSelectedDateKey(dateKey);
  };

  const closeModal = () => setSelectedDateKey(null);

  const selectedDateLabel =
    selectedDateKey && !selectedDateKey.startsWith('prev-') && !selectedDateKey.startsWith('next-')
      ? (() => {
          const d = parseLocalDateKey(selectedDateKey);
          return t('emotionCalendar.dateLabel', {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
          });
        })()
      : '';

  return (
    <>
      <View style={styles.calendarBlock}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.monthNavButton}
            onPress={handlePrevMonth}
            accessibilityRole="button"
            accessibilityLabel={t('emotionCalendar.prevMonthA11y')}
          >
            <Text style={styles.monthNavText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            style={styles.monthNavButton}
            onPress={handleNextMonth}
            accessibilityRole="button"
            accessibilityLabel={t('emotionCalendar.nextMonthA11y')}
          >
            <Text style={styles.monthNavText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.map((w) => (
            <Text key={w} style={styles.weekdayCell}>
              {w}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map(({ dateKey, day, inMonth }) => {
            const logsForDay =
              !dateKey.startsWith('prev-') && !dateKey.startsWith('next-') && inMonth
                ? grouped[dateKey] ?? []
                : [];
            const hasLogs = logsForDay.length > 0;

            const dots = hasLogs
              ? Array.from(
                  new Map(
                    logsForDay
                      .map((log) => getEmotionById(log.emotionId))
                      .filter((e): e is NonNullable<ReturnType<typeof getEmotionById>> => !!e)
                      .map((emotion) => [emotion.id, emotion])
                  ).values()
                ).slice(0, 3)
              : [];

            return (
              <Pressable
                key={dateKey}
                style={({ pressed }) => [
                  styles.dayCell,
                  !inMonth && styles.dayCellOutside,
                  pressed && inMonth && styles.dayCellPressed,
                ]}
                disabled={!inMonth}
                onPress={() => handleSelectDate(dateKey)}
                accessibilityRole={inMonth ? 'button' : undefined}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    !inMonth && styles.dayNumberOutside,
                    hasLogs && styles.dayNumberWithLogs,
                  ]}
                >
                  {day || ''}
                </Text>
                {hasLogs && (
                  <View style={styles.dotsRow}>
                    {dots.map((emotion, idx) => (
                      <View
                        key={`${emotion.id}-${idx}`}
                        style={[styles.dot, { backgroundColor: emotion.bgColor }]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal
        transparent
        visible={!!selectedDateKey}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPress} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDateLabel}</Text>
              <Pressable
                onPress={closeModal}
                accessibilityRole="button"
                accessibilityLabel={t('emotionCalendar.modalClose')}
              >
                <Text style={styles.modalCloseText}>{t('emotionCalendar.modalClose')}</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedLogs.length === 0 ? (
                <Text style={styles.muted}>{t('emotionCalendar.emptyDay')}</Text>
              ) : (
                selectedLogs.map((log) => {
                  const emotion = getEmotionById(log.emotionId);
                  return (
                    <View key={log.id} style={styles.logItem}>
                      <View
                        style={[
                          styles.logColorBar,
                          emotion && { backgroundColor: emotion.bgColor },
                        ]}
                      />
                      <View style={styles.logBody}>
                        <Text style={styles.logTime}>{log.timeLabel}</Text>
                        <Text style={styles.logLabel}>{emotion?.label ?? log.label}</Text>
                        {log.memo ? (
                          <Text style={styles.logMemo}>
                            {t('emotionCalendar.memoLabel')} {log.memo}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  calendarBlock: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  monthNavButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthNavText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 2,
  },
  dayCellOutside: {
    opacity: 0.25,
  },
  dayCellPressed: {
    backgroundColor: 'rgba(55,65,81,0.7)',
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 2,
  },
  dayNumberOutside: {
    color: '#4B5563',
  },
  dayNumberWithLogs: {
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdropPress: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4B5563',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalContent: {
    maxHeight: 260,
    marginTop: 4,
  },
  muted: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  logColorBar: {
    width: 6,
    backgroundColor: '#4B5563',
  },
  logBody: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  logLabel: {
    fontSize: 14,
    color: '#F9FAFB',
  },
  logMemo: {
    marginTop: 2,
    fontSize: 12,
    color: '#D1D5DB',
  },
});