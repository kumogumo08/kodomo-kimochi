import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePremium } from '@/contexts/PremiumContext';
import { UpgradeCard } from '@/components/UpgradeCard';

type PremiumGateProps = {
  children: React.ReactNode;
  /** 未課金時に表示する代替UI。未指定時は UpgradeCard */
  fallback?: React.ReactNode;
  /** UpgradeCard 用の機能名（fallback 未指定時） */
  featureName?: string;
  /** UpgradeCard 用の説明（fallback 未指定時） */
  description?: string;
};

/**
 * プレミアム時は children を表示、未課金時は fallback または UpgradeCard を表示する。
 * 利用制御には effectivePremium を使用（開発用フラグで解除可能）。
 */
export function PremiumGate({
  children,
  fallback,
  featureName,
  description,
}: PremiumGateProps) {
  const { effectivePremium, isLoadingPremium } = usePremium();

  if (isLoadingPremium) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <ActivityIndicator size="small" color="#6B7280" />
      </View>
    );
  }

  if (effectivePremium) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <UpgradeCard
      featureName={featureName}
      description={description}
    />
  );
}
