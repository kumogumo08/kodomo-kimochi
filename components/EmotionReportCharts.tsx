import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type EmotionCategoryKey } from '@/lib/emotion-categories';
import type { ReportData } from '@/lib/report-data';

export type { ReportData };

export function EmotionReportCharts({ reportData }: { reportData: ReportData }) {
  const { t } = useTranslation();
  const comparisonText =
    reportData.previousPeriodLabel != null && reportData.diffFromPrevious != null
      ? reportData.diffFromPrevious >= 0
        ? t('history.comparisonPlus', { previous: reportData.previousPeriodLabel, diff: reportData.diffFromPrevious })
        : t('history.comparisonMinus', { previous: reportData.previousPeriodLabel, diff: reportData.diffFromPrevious })
      : null;

  const totalForPie = reportData.pieData.reduce((sum, item) => sum + item.population, 0);

  return (
    <View style={styles.container}>
      {/* 合計件数＋期間比較 */}
      <View style={styles.block}>
        <Text style={styles.title}>
          {t('history.chart.chosenTimesTitle', { periodLabel: reportData.periodLabel })}
        </Text>
        <Text style={styles.mainNumber}>
          {t('history.chart.chosenTimes', { count: reportData.total })}
          {comparisonText ? <Text style={styles.subText}> {comparisonText}</Text> : null}
        </Text>
      </View>

      {/* 感情ごとの件数＋割合バー */}
      <View style={styles.block}>
        <Text style={styles.title}>
          {t('history.chart.emotionRatioTitle', { periodLabel: reportData.periodLabel })}
        </Text>
        {reportData.pieData.length === 0 || totalForPie === 0 ? (
          <Text style={styles.muted}>{t('history.noRecordsForPeriod')}</Text>
        ) : (
          reportData.pieData.map((item) => {
            const ratio = item.population / totalForPie;
            const percent = Math.round(ratio * 1000) / 10; // 小数1桁
            const widthPercent = Math.max(4, ratio * 100); // 0件はここには来ないが念のため最小幅

            return (
              <View key={item.name} style={styles.row}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.name}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: item.color,
                          width: `${widthPercent}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.rowNumbers}>
                  <Text style={styles.rowValue}>{t('history.countItems', { count: item.population })}</Text>
                  <Text style={styles.rowPercent}>{percent}%</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 感情カテゴリ別件数 */}
      <View style={styles.block}>
        <Text style={styles.title}>{t('history.chart.emotionCategoryBreakdownTitle')}</Text>
        {(['positive', 'anger', 'sadness'] as EmotionCategoryKey[]).map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{t(`history.emotionCategoryLabels.${key}`)}</Text>
            <Text style={styles.rowValue}>
              {t('history.countItems', { count: reportData.categoryCounts[key] })}
            </Text>
          </View>
        ))}
      </View>

      {/* 高ぶり / 落ち着き */}
      <View style={styles.block}>
        <Text style={styles.title}>{t('history.chart.highLowTitle')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('history.highLowLabels.high')}</Text>
          <Text style={styles.rowValue}>{t('history.countItems', { count: reportData.highLowCounts.high })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('history.highLowLabels.low')}</Text>
          <Text style={styles.rowValue}>{t('history.countItems', { count: reportData.highLowCounts.low })}</Text>
        </View>
      </View>

      {/* 快 / 不快 */}
      <View style={styles.block}>
        <Text style={styles.title}>{t('history.chart.pleasantUnpleasantTitle')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('history.pleasantUnpleasantLabels.pleasant')}</Text>
          <Text style={styles.rowValue}>{t('history.countItems', { count: reportData.pleasantCounts.pleasant })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('history.pleasantUnpleasantLabels.unpleasant')}</Text>
          <Text style={styles.rowValue}>{t('history.countItems', { count: reportData.pleasantCounts.unpleasant })}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  block: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  mainNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  muted: {
    fontSize: 13,
    color: '#777',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowText: {
    flex: 1,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  rowNumbers: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  rowPercent: {
    fontSize: 11,
    color: '#777',
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});
