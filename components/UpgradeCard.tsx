import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const CARD_BG = '#FFF';
const BORDER_COLOR = 'rgba(0,0,0,0.06)';
const MUTED_COLOR = '#555';
const TITLE_COLOR = '#1a1a1a';
const TINT = '#0a7ea4';

type UpgradeCardProps = {
  /** 機能名（任意） */
  featureName?: string;
  /** 説明文（任意） */
  description?: string;
  /** プレミアムをみる押下時のコールバック。未指定時は /premium へ遷移 */
  onPressPremium?: () => void;
};

/**
 * 一覧・機能ブロック用のプレミアム案内（価格は表示しない。金額は /premium で確認）。
 */
export function UpgradeCard({
  featureName,
  description,
  onPressPremium,
}: UpgradeCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const descriptionText = description ?? t('upgradeCard.defaultDescription');
  const handlePress = () => {
    if (onPressPremium) {
      onPressPremium();
    } else {
      router.push('/premium');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.badge}>{t('upgradeCard.badge')}</Text>
      {featureName ? (
        <Text style={styles.featureName}>{featureName}</Text>
      ) : (
        <Text style={styles.heading}>{t('upgradeCard.heading')}</Text>
      )}
      <Text style={styles.description}>{descriptionText}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('upgradeCard.button')}>
        <Text style={styles.buttonText}>{t('upgradeCard.button')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: TINT,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 8,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED_COLOR,
    marginBottom: 16,
  },
  button: {
    backgroundColor: TINT,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
