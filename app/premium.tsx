import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePremium } from '@/contexts/PremiumContext';

const SCREEN_BG = '#F5F5F5';
const CARD_BG = '#FFF';
const TITLE_COLOR = '#1a1a1a';
const MUTED_COLOR = '#555';
const BORDER_COLOR = 'rgba(0,0,0,0.06)';
const TINT = '#0a7ea4';

export default function PremiumScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { t: tSettings } = useTranslation('settings');
  const {
    isPremium,
    isLoadingPremium,
    lastPremiumError,
    purchasePremium,
    restorePremium,
    localizedPriceText,
  } = usePremium();
  const [showActionBillingError, setShowActionBillingError] = useState(false);

  const errorText = (() => {
    if (!showActionBillingError || !lastPremiumError) return null;
    const key = `billing.errors.${lastPremiumError.code}`;
    const translated = tSettings(key);
    if (translated === key) return tSettings('billing.errors.unknown');
    return translated;
  })();

  const handlePurchase = async () => {
    setShowActionBillingError(true);
    const ok = await purchasePremium();
    if (ok) router.back();
  };

  const handleRestore = async () => {
    setShowActionBillingError(true);
    const ok = await restorePremium();
    if (ok) {
      Alert.alert(tSettings('billing.restoreSuccessTitle'), tSettings('billing.restoreSuccessBody'));
      router.back();
    }
  };

  const priceText = isLoadingPremium
    ? t('premium.priceLoading')
    : localizedPriceText ?? t('premium.priceUnavailable');

  return (
    <>
      <Stack.Screen
        options={{
          title: t('premium.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.intro}>{t('premium.descriptionIntro')}</Text>
            <Text style={styles.body}>
              <Text style={styles.bold}>{t('premium.featureCalendarTitle')}</Text>
              {'\n'}
              {t('premium.featureCalendarBody')}
              {'\n\n'}
              <Text style={styles.bold}>{t('premium.featureReportTitle')}</Text>
              {'\n'}
              {t('premium.featureReportBody')}
              {'\n\n'}
              <Text style={styles.bold}>{t('premium.featureSiblingTitle')}</Text>
              {'\n'}
              {t('premium.featureSiblingBody')}
              {'\n\n'}
              <Text style={styles.bold}>{t('premium.featureMemoTitle')}</Text>
              {'\n'}
              {t('premium.featureMemoBody')}
            </Text>

            <Text style={styles.price}>{priceText}</Text>
            {/* NOTE: 表示上の価格は目安。実際の請求はストア表示が正。 */}
            <Text style={styles.priceNote}>{t('premium.priceNote')}</Text>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            {isPremium ? (
              <Text style={styles.purchasedText}>{t('premium.purchased')}</Text>
            ) : (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.primaryButton, isLoadingPremium && styles.buttonDisabled]}
                  onPress={() => void handlePurchase()}
                  disabled={isLoadingPremium}
                  accessibilityRole="button"
                  accessibilityLabel={t('premium.buyButton')}>
                  <Text style={styles.primaryButtonText}>
                    {isLoadingPremium ? t('common.loading') : t('premium.buyButton')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, isLoadingPremium && styles.buttonDisabled]}
                  onPress={() => void handleRestore()}
                  disabled={isLoadingPremium}
                  accessibilityRole="button"
                  accessibilityLabel={t('premium.restoreButton')}>
                  <Text style={styles.secondaryButtonText}>{t('premium.restoreButton')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: TITLE_COLOR,
    fontWeight: '600',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED_COLOR,
    marginBottom: 20,
  },
  bold: {
    fontWeight: '700',
    color: TITLE_COLOR,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
    marginBottom: 16,
  },
  errorText: {
    marginBottom: 12,
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  purchasedText: {
    marginTop: 4,
    color: '#166534',
    fontWeight: '700',
    fontSize: 16,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: TINT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
