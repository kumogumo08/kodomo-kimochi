import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

import { ChildSwitcher } from '@/components/ChildSwitcher';
import { getEmotions } from '@/constants/emotions';
import { useChild } from '@/contexts/ChildContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEFAULT_CHILD_ID } from '@/lib/children';
import { generateDummyEmotionHistoryOneYear } from '@/lib/emotion-history';
import { changeLanguage } from '@/lib/i18n';
import {
  cancelScheduledNotification,
  getNotificationPermissionStatus,
  getNotificationSettings,
  initializeNotificationSystem,
  MAX_NOTIFICATION_SETTINGS,
  NotificationSetting,
  requestNotificationPermission,
  saveNotificationSettings,
  syncNotificationSchedule,
} from '@/lib/notification-settings';
import { useTranslation } from 'react-i18next';

const ACCENT = '#0a7ea4';
const TERMS_URL = 'https://procom.jp/kodomo-kimochi/terms';
const LAW_URL = 'https://procom.jp/kodomo-kimochi/law';

function toTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getDateFromTime(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const {
    isPremium,
    isLoadingPremium,
    refreshPremiumStatus,
    effectivePremium,
    devPremiumOverride,
    setDevPremiumOverride,
  } = usePremium();
  const { removeChild, selectedChildId } = useChild();
  const { resetForDev } = useTutorial();
  const { i18n, t } = useTranslation();
  const { t: tSettings } = useTranslation('settings');
  const currentLang: 'ja' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'ja';
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [isNotificationLoading, setIsNotificationLoading] = useState(true);
  const [iosPickerTargetId, setIosPickerTargetId] = useState<string | null>(null);
  const [androidPickerTargetId, setAndroidPickerTargetId] = useState<string | null>(null);

  const canAddNotification = notificationSettings.length < MAX_NOTIFICATION_SETTINGS;
  const androidPickerTarget = useMemo(
    () => notificationSettings.find((item) => item.id === androidPickerTargetId) ?? null,
    [androidPickerTargetId, notificationSettings]
  );

  useEffect(() => {
    const load = async () => {
      setIsNotificationLoading(true);
      try {
        await initializeNotificationSystem();
        const [status, settings] = await Promise.all([
          getNotificationPermissionStatus(),
          getNotificationSettings(),
        ]);
        setNotificationPermission(status);
        setNotificationSettings(settings);
      } finally {
        setIsNotificationLoading(false);
      }
    };

    void load();
  }, []);

  const handleGenerateDummyHistory = async () => {
    try {
      const count = await generateDummyEmotionHistoryOneYear(
        getEmotions(),
        selectedChildId || DEFAULT_CHILD_ID
      );
      Alert.alert(
        t('settings.dummyHistory.generateTitle'),
        count > 0
          ? t('settings.dummyHistory.generateSuccess', { count })
          : t('settings.dummyHistory.generateEmpty')
      );
    } catch {
      Alert.alert(
        t('settings.dummyHistory.generateErrorTitle'),
        t('settings.dummyHistory.generateErrorBody')
      );
    }
  };

  const handleRequestRemoveChild = (childId: string) => {
    Alert.alert(
      t('common.deleteConfirmTitle'),
      t('settings.deleteChildHistoryConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void removeChild(childId);
          },
        },
      ]
    );
  };

  const devOverrideLabel =
    devPremiumOverride === null ? 'null' : devPremiumOverride ? 'true' : 'false';

  const persistNotificationSettings = useCallback(async (next: NotificationSetting[]) => {
    setNotificationSettings(next);
    await saveNotificationSettings(next);
  }, []);

  const handleRequestNotificationPermission = useCallback(async () => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);

    if (status !== 'granted') {
      Alert.alert(
        t('settings.notifications.permissionDeniedTitle'),
        t('settings.notifications.permissionDeniedBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.notifications.openSettings'), onPress: () => void Linking.openSettings() },
        ]
      );
    }
  }, [t]);

  const handleOpenExternalLink = useCallback(
    async (url: string) => {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('リンクを開けませんでした');
      }
    },
    []
  );

  const handleAddNotification = useCallback(async () => {
    if (!canAddNotification) return;

    const next: NotificationSetting[] = [
      ...notificationSettings,
      {
        id: `notification_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        enabled: false,
        hour: 20,
        minute: 0,
      },
    ];
    await persistNotificationSettings(next);
  }, [canAddNotification, notificationSettings, persistNotificationSettings]);

  const upsertNotificationAt = useCallback(
    async (id: string, updater: (current: NotificationSetting) => NotificationSetting) => {
      const target = notificationSettings.find((item) => item.id === id);
      if (!target) return;

      let updated = updater(target);
      if (updated.enabled) {
        if (notificationPermission !== 'granted') {
          const status = await requestNotificationPermission();
          setNotificationPermission(status);
          if (status !== 'granted') {
            Alert.alert(
              t('settings.notifications.permissionNeededTitle'),
              t('settings.notifications.permissionNeededBody')
            );
            updated = { ...updated, enabled: false };
          }
        }
      }

      const synced = await syncNotificationSchedule(updated);
      const next = notificationSettings.map((item) => (item.id === id ? synced : item));
      await persistNotificationSettings(next);
    },
    [notificationPermission, notificationSettings, persistNotificationSettings, t]
  );

  const handleToggleNotification = useCallback(
    async (id: string, enabled: boolean) => {
      await upsertNotificationAt(id, (current) => ({ ...current, enabled }));
    },
    [upsertNotificationAt]
  );

  const handleUpdateNotificationTime = useCallback(
    async (id: string, hour: number, minute: number) => {
      await upsertNotificationAt(id, (current) => ({ ...current, hour, minute }));
    },
    [upsertNotificationAt]
  );

  const handleRemoveNotification = useCallback(
    async (id: string) => {
      const target = notificationSettings.find((item) => item.id === id);
      if (!target) return;

      await cancelScheduledNotification(target.notificationId);
      const next = notificationSettings.filter((item) => item.id !== id);
      setIosPickerTargetId((prev) => (prev === id ? null : prev));
      setAndroidPickerTargetId((prev) => (prev === id ? null : prev));
      await persistNotificationSettings(next);
    },
    [notificationSettings, persistNotificationSettings]
  );

  // 購入・復元後の戻りやタブ再表示で RevenueCat 状態と表示を揃える
  useFocusEffect(
    useCallback(() => {
      void refreshPremiumStatus();
    }, [refreshPremiumStatus])
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.usageTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('settings.usageTitle')}</Text>
          </View>

          {/* 1. このアプリについて */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.aboutTitle')}</Text>
            <Text style={styles.lead}>{t('settings.aboutLead')}</Text>
            <Text style={styles.body}>{t('settings.aboutBody1')}</Text>
            <Text style={styles.body}>{t('settings.aboutBody2')}</Text>
          </View>

          {/* 2. 使い方 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.usageTitle')}</Text>
            <UsageBodyText text={t('settings.usageBody')} styles={styles} />
            <Text style={styles.note}>
              {t('settings.aboutNote')}
            </Text>
          </View>

          {/* 3. 参考にしている考え方 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.referenceConceptsTitle')}</Text>
            <Text style={styles.body}>{t('settings.referenceConceptsBody')}</Text>
          </View>         

         {/* 5. 言語 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.languageHeading')}</Text>
            <View style={styles.languageRow}>
              <Pressable
                onPress={() => changeLanguage('ja')}
                accessibilityRole="button"
                accessibilityState={{ selected: currentLang === 'ja' }}
                accessibilityLabel={t('settings.languageOptionJaA11y')}
                style={[
                  styles.languageOption,
                  currentLang === 'ja' && styles.languageOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.languageOptionText,
                    currentLang === 'ja' && styles.languageOptionTextSelected,
                  ]}>
                  {t('settings.languageOptionJaText')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => changeLanguage('en')}
                accessibilityRole="button"
                accessibilityState={{ selected: currentLang === 'en' }}
                accessibilityLabel={t('settings.languageOptionEnA11y')}
                style={[
                  styles.languageOption,
                  currentLang === 'en' && styles.languageOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.languageOptionText,
                    currentLang === 'en' && styles.languageOptionTextSelected,
                  ]}>
                  {t('settings.languageOptionEnText')}
                </Text>
              </Pressable>
            </View>
          </View> 

          {/* 6. 通知設定 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.notifications.title')}</Text>
            <Text style={styles.body}>{t('settings.notifications.description')}</Text>

            {notificationPermission !== 'granted' ? (
              <View style={styles.notificationPermissionBox}>
                <Text style={styles.notificationPermissionText}>
                  {t('settings.notifications.permissionOff')}
                </Text>
                <Pressable
                  style={styles.notificationPermissionButton}
                  onPress={handleRequestNotificationPermission}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.notifications.requestPermission')}
                >
                  <Text style={styles.notificationPermissionButtonText}>
                    {t('settings.notifications.requestPermission')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isNotificationLoading ? (
              <Text style={styles.note}>{t('common.loading')}</Text>
            ) : (
              <>
                <View style={styles.notificationList}>
                  {notificationSettings.map((item, index) => {
                    const isIosPickerOpen = Platform.OS === 'ios' && iosPickerTargetId === item.id;
                    return (
                      <View key={item.id} style={styles.notificationRow}>
                        <View style={styles.notificationRowHeader}>
                          <Text style={styles.notificationRowTitle}>
                            {t('settings.notifications.itemLabel', { index: index + 1 })}
                          </Text>
                          <View style={styles.notificationRowActions}>
                            <Pressable
                              style={styles.notificationTimeButton}
                              onPress={() => {
                                if (Platform.OS === 'ios') {
                                  setIosPickerTargetId((prev) => (prev === item.id ? null : item.id));
                                } else {
                                  setAndroidPickerTargetId(item.id);
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={t('settings.notifications.changeTime')}
                            >
                              <Text style={styles.notificationTimeText}>
                                {toTimeLabel(item.hour, item.minute)}
                              </Text>
                            </Pressable>
                            <Switch
                              value={item.enabled}
                              onValueChange={(enabled) => {
                                void handleToggleNotification(item.id, enabled);
                              }}
                            />
                          </View>
                        </View>

                        {notificationSettings.length > 1 ? (
                          <Pressable
                            onPress={() => void handleRemoveNotification(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('settings.notifications.remove')}
                          >
                            <Text style={styles.notificationRemoveText}>
                              {t('settings.notifications.remove')}
                            </Text>
                          </Pressable>
                        ) : null}

                        {isIosPickerOpen ? (
                          <View style={styles.notificationPickerWrap}>
                            <DateTimePicker
                              mode="time"
                              display="spinner"
                              value={getDateFromTime(item.hour, item.minute)}
                              themeVariant={isDark ? 'dark' : 'light'}
                              textColor={isDark ? '#ECEDEE' : '#11181C'}
                              onChange={(_event: any, selected?: Date) => {
                                if (!selected) return;
                                void handleUpdateNotificationTime(
                                  item.id,
                                  selected.getHours(),
                                  selected.getMinutes()
                                );
                              }}
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.notificationAddButton,
                    !canAddNotification && styles.notificationAddButtonDisabled,
                  ]}
                  onPress={() => void handleAddNotification()}
                  disabled={!canAddNotification}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.notifications.add')}
                >
                  <Text style={styles.notificationAddButtonText}>
                    {t('settings.notifications.add')}
                  </Text>
                </Pressable>
                {!canAddNotification ? (
                  <Text style={styles.note}>{t('settings.notifications.maxReached')}</Text>
                ) : null}
              </>
            )}
          </View>

          {Platform.OS === 'android' && androidPickerTarget ? (
            <DateTimePicker
              mode="time"
              value={getDateFromTime(androidPickerTarget.hour, androidPickerTarget.minute)}
              onChange={(event: any, selected?: Date) => {
                if (event?.type === 'dismissed') {
                  setAndroidPickerTargetId(null);
                  return;
                }
                if (selected) {
                  void handleUpdateNotificationTime(
                    androidPickerTarget.id,
                    selected.getHours(),
                    selected.getMinutes()
                  );
                }
                setAndroidPickerTargetId(null);
              }}
            />
          ) : null}

          {/* 7. プレミアム機能（区切り見出し） */}
          <View style={styles.premiumSeparator}>
            <View style={styles.premiumSeparatorLine} />
            <View style={styles.premiumSeparatorLabelWrap}>
              <Text style={styles.premiumSeparatorLabel}>{t('settings.premiumTitle')}</Text>
            </View>
            <View style={styles.premiumSeparatorLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{tSettings('billing.title')}</Text>
            <Text style={styles.body}>{tSettings('billing.description')}</Text>
            {/* NOTE: 説明文の価格は目安。実際の請求額はストア表示が正。 */}
            {/* プレミアム利用中（effectivePremium）のとき「購入済み」表示 */}
            {effectivePremium ? (
              <Text style={styles.billingPurchasedText}>{tSettings('billing.purchased')}</Text>
            ) : null}
            {/* プレミアム利用権がないときだけ「プレミアムを見る」（effectivePremium は Context の単一ソース） */}
            {!effectivePremium ? (
              <View style={styles.billingActions}>
                <Pressable
                  style={[styles.billingPrimaryButton, isLoadingPremium && styles.billingButtonDisabled]}
                  onPress={() => router.push('/premium')}
                  disabled={isLoadingPremium}
                  accessibilityRole="button"
                  accessibilityLabel={tSettings('billing.buyButton')}
                >
                  <Text style={styles.billingPrimaryButtonText}>
                    {isLoadingPremium ? t('common.loading') : tSettings('billing.buyButton')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* 8. 子どもの管理 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.childManagerTitle')}</Text>
            <Text style={styles.body}>{t('settings.childManagerBody')}</Text>
            <View style={styles.childManagerWrap}>
              <ChildSwitcher
                onRequestUpgrade={() => router.push('/premium')}
                onRequestRemoveChild={handleRequestRemoveChild}
              />
            </View>
          </View>

          {/* 9. 感情レポートの見方 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.emotionReportTitle')}</Text>
            <Text style={styles.body}>{t('settings.emotionReportBody')}</Text>
          </View>

          {/* 10. 感情カテゴリについて */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.emotionCategoriesTitle')}</Text>
            <Text style={styles.body}>{t('settings.emotionCategoriesBody')}</Text>
          </View>

          {/* メモ機能について */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.memoFeatureTitle')}</Text>
            <Text style={styles.body}>{t('settings.memoFeatureBody')}</Text>
          </View>

          {/* 11. 規約・法的表記 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>{t('settings.legalSectionTitle')}</Text>
            <Pressable
              style={styles.legalLinkRow}
              onPress={() => void handleOpenExternalLink(TERMS_URL)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.termsA11y')}
            >
              <Text style={styles.legalLinkText}>{t('settings.terms')}</Text>
            </Pressable>
            <Pressable
              style={styles.legalLinkRow}
              onPress={() => void handleOpenExternalLink(LAW_URL)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.lawA11y')}
            >
              <Text style={styles.legalLinkText}>{t('settings.law')}</Text>
            </Pressable>
          </View>

          {__DEV__ ? (
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>{t('settings.adminDebugTitle')}</Text>
              <Text style={[styles.devDebugStatus, styles.devDebugStatusFirst]}>
                {t('settings.adminDebugLineIsPremium', { value: String(isPremium) })}
              </Text>
              <Text style={styles.devDebugStatus}>
                {t('settings.adminDebugLineEffective', { value: String(effectivePremium) })}
              </Text>
              <Text style={styles.devDebugStatus}>
                {t('settings.adminDebugLineOverride', { value: devOverrideLabel })}
              </Text>
              <Text style={styles.note}>{t('settings.adminDebugIntro')}</Text>

              <View style={styles.devToggleRow}>
                <Pressable
                  style={[
                    styles.devToggleButton,
                    devPremiumOverride === null && styles.devToggleButtonActive,
                  ]}
                  onPress={() => setDevPremiumOverride(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.devPremium.normalA11y')}
                >
                  <Text
                    style={[
                      styles.devToggleText,
                      devPremiumOverride === null && styles.devToggleTextActive,
                    ]}
                  >
                    {t('settings.devPremium.normalText')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.devToggleButton,
                    devPremiumOverride === true && styles.devToggleButtonActive,
                  ]}
                  onPress={() => setDevPremiumOverride(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.devPremium.forcePremiumA11y')}
                >
                  <Text
                    style={[
                      styles.devToggleText,
                      devPremiumOverride === true && styles.devToggleTextActive,
                    ]}
                  >
                    {t('settings.devPremium.forcePremiumText')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.devToggleButton,
                    devPremiumOverride === false && styles.devToggleButtonActive,
                  ]}
                  onPress={() => setDevPremiumOverride(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.devPremium.forceFreeA11y')}
                >
                  <Text
                    style={[
                      styles.devToggleText,
                      devPremiumOverride === false && styles.devToggleTextActive,
                    ]}
                  >
                    {t('settings.devPremium.forceFreeText')}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.devActionsRow}>
                <Pressable
                  style={styles.devActionButton}
                  onPress={() => void refreshPremiumStatus()}
                  disabled={isLoadingPremium}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.adminDebugRefreshA11y')}>
                  <Text style={styles.devActionText}>{t('settings.adminDebugRefresh')}</Text>
                </Pressable>
              </View>

              <View style={styles.devActionsRow}>
                <Pressable
                  style={styles.devActionButton}
                  onPress={handleGenerateDummyHistory}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.dummyHistory.addDummyHistoryA11y')}
                >
                  <Text style={styles.devActionText}>{t('settings.dummyHistory.addDummyHistoryText')}</Text>
                </Pressable>
              </View>

              <View style={styles.devActionsRow}>
                <Pressable
                  style={styles.devActionButton}
                  onPress={() => {
                    void (async () => {
                      await resetForDev();
                      router.replace('/(tabs)');
                    })();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="開発用: チュートリアルを未完了に戻してホームへ"
                >
                  <Text style={styles.devActionText}>
                    チュートリアル未完了に戻す（開発）
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.note}>
                {t('settings.adminDebugNote')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(isDark: boolean) {
  const palette = {
    screenBg: isDark ? '#111214' : '#F5F5F5',
    cardBg: isDark ? '#1A1C1F' : '#FFF',
    title: isDark ? '#ECEDEE' : '#1a1a1a',
    muted: isDark ? '#B0B8C0' : '#555',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    note: isDark ? '#9BA1A6' : '#777',
    optionBg: isDark ? '#202328' : '#FFF',
    optionText: isDark ? '#C9D1D9' : '#6B7280',
    dangerText: isDark ? '#fca5a5' : '#b91c1c',
    successText: isDark ? '#86efac' : '#166534',
  };

  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.screenBg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: palette.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: palette.title,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.muted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: palette.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.title,
    marginBottom: 8,
  },
  premiumSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  premiumSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: isDark ? 'rgba(10,126,164,0.45)' : 'rgba(10,126,164,0.25)',
  },
  premiumSeparatorLabelWrap: {
    backgroundColor: isDark ? 'rgba(10,126,164,0.25)' : 'rgba(10,126,164,0.10)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(10,126,164,0.5)' : 'rgba(10,126,164,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginHorizontal: 10,
  },
  premiumSeparatorLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT,
  },
  lead: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.title,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.muted,
  },
  bodyBold: {
    fontWeight: '700',
  },
  childManagerWrap: {
    marginTop: 10,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: palette.note,
  },
  notificationPermissionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.4)' : 'rgba(239, 68, 68, 0.25)',
    backgroundColor: isDark ? 'rgba(127, 29, 29, 0.25)' : 'rgba(254, 242, 242, 0.8)',
  },
  notificationPermissionText: {
    fontSize: 13,
    lineHeight: 18,
    color: isDark ? '#fecaca' : '#991b1b',
  },
  notificationPermissionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: ACCENT,
  },
  notificationPermissionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationPickerWrap: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: isDark ? '#111214' : '#FFF',
    overflow: 'hidden',
  },
  notificationList: {
    marginTop: 10,
    gap: 10,
  },
  notificationRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: palette.optionBg,
  },
  notificationRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.title,
    flexShrink: 1,
  },
  notificationRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTimeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.cardBg,
  },
  notificationTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  notificationRemoveText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: palette.dangerText,
  },
  notificationAddButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(10,126,164,0.25)' : '#E6F4FE',
  },
  notificationAddButtonDisabled: {
    opacity: 0.55,
  },
  notificationAddButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  legalLinkRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  legalLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  languageOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.optionBg,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  languageOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: isDark ? 'rgba(7, 199, 247, 0.22)' : 'rgba(7, 199, 247, 0.12)',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.optionText,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: ACCENT,
  },
  billingActions: {
    marginTop: 12,
    gap: 10,
  },
  billingPrimaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  billingPrimaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  billingButtonDisabled: {
    opacity: 0.65,
  },
  billingPurchasedText: {
    marginTop: 8,
    color: palette.successText,
    fontWeight: '700',
    fontSize: 14,
  },
  devToggleRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  devToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: palette.optionBg,
  },
  devToggleButtonActive: {
    backgroundColor: ACCENT,
  },
  devToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.muted,
  },
  devToggleTextActive: {
    color: '#FFF',
  },
  devActionsRow: {
    marginTop: 12,
  },
  devActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.optionBg,
  },
  devActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.title,
    textAlign: 'center',
  },
  devDebugStatus: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: palette.muted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  devDebugStatusFirst: {
    marginTop: 0,
  },
  });
}

function UsageBodyText({
  text,
  styles,
}: {
  text: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);
  return (
    <Text style={styles.body}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <Text key={i} style={[styles.body, styles.bodyBold]}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part === '') {
          return null;
        }
        return (
          <Text key={i} style={styles.body}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}
