import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { DEV_FORCE_PREMIUM_UNLOCK } from '@/constants/premium';
import {
  type BillingError,
  getCustomerPremiumStatus,
  getPremiumPricingSafe,
  initializeBilling,
  purchasePremiumUnlock,
  restorePremiumUnlock,
} from '@/services/billing';

export type DevPremiumOverride = boolean | null;

const DEV_PREMIUM_OVERRIDE_KEY = 'kodomo_kimochi_dev_premium_override';

type PremiumContextValue = {
  isPremium: boolean;
  isLoadingPremium: boolean;
  lastPremiumError: BillingError | null;
  currentOffering: PurchasesOffering | null;
  currentPackage: PurchasesPackage | null;
  localizedPriceText: string | null;
  purchasePremium: () => Promise<boolean>;
  restorePremium: () => Promise<boolean>;
  refreshPremiumStatus: () => Promise<boolean>;
  /** 管理者向けのデバッグ上書き（null のとき通常判定） */
  devPremiumOverride: DevPremiumOverride;
  setDevPremiumOverride: (value: DevPremiumOverride) => void;
  /**
   * 利用制御に使う「実質プレミアムか」。
   * 開発用フラグが ON のときは未課金でも true（ロック解除）。
   * 本番では isPremium と同一。
   */
  effectivePremium: boolean;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setPremiumState] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(true);
  const [lastPremiumError, setLastPremiumError] = useState<BillingError | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [localizedPriceText, setLocalizedPriceText] = useState<string | null>(null);
  const [devPremiumOverride, setDevPremiumOverrideState] = useState<DevPremiumOverride>(null);
  const [devOverrideLoaded, setDevOverrideLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DEV_PREMIUM_OVERRIDE_KEY);
        if (!mounted) return;
        if (raw === 'true') setDevPremiumOverrideState(true);
        else if (raw === 'false') setDevPremiumOverrideState(false);
        else setDevPremiumOverrideState(null);
      } catch {
        if (mounted) setDevPremiumOverrideState(null);
      } finally {
        if (mounted) setDevOverrideLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const refreshPremiumStatus = useCallback(async () => {
    setIsLoadingPremium(true);
    setLastPremiumError(null);
    try {
      await initializeBilling();
      const [next, pricing] = await Promise.all([
        getCustomerPremiumStatus(),
        getPremiumPricingSafe(),
      ]);
      setPremiumState(next);
      setCurrentOffering(pricing.currentOffering);
      setCurrentPackage(pricing.currentPackage);
      setLocalizedPriceText(pricing.localizedPriceText);
      return next;
    } catch {
      // 初回・再取得での課金初期化失敗は Expo Go 等で起こり得る。カード常時の赤表示は避けるため保持しない。
      setPremiumState(false);
      setCurrentOffering(null);
      setCurrentPackage(null);
      setLocalizedPriceText(null);
      return false;
    } finally {
      setIsLoadingPremium(false);
    }
  }, []);

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const purchasePremium = useCallback(async () => {
    setIsLoadingPremium(true);
    setLastPremiumError(null);
    try {
      const purchased = await purchasePremiumUnlock();
      const refreshed = await getCustomerPremiumStatus();
      setPremiumState(purchased || refreshed);
      const pricing = await getPremiumPricingSafe();
      setCurrentOffering(pricing.currentOffering);
      setCurrentPackage(pricing.currentPackage);
      setLocalizedPriceText(pricing.localizedPriceText);
      return purchased || refreshed;
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as BillingError).code
          : undefined;
      // ユーザーがストアの購入 sheet を閉じただけのときはエラー扱いにしない（赤表示を避ける）
      if (code === 'user_cancelled') {
        setLastPremiumError(null);
      } else {
        setLastPremiumError(err as BillingError);
      }
      return false;
    } finally {
      setIsLoadingPremium(false);
    }
  }, []);

  const restorePremium = useCallback(async () => {
    setIsLoadingPremium(true);
    setLastPremiumError(null);
    try {
      const restored = await restorePremiumUnlock();
      const refreshed = await getCustomerPremiumStatus();
      setPremiumState(restored || refreshed);
      const pricing = await getPremiumPricingSafe();
      setCurrentOffering(pricing.currentOffering);
      setCurrentPackage(pricing.currentPackage);
      setLocalizedPriceText(pricing.localizedPriceText);
      return restored || refreshed;
    } catch (err) {
      setLastPremiumError(err as BillingError);
      return false;
    } finally {
      setIsLoadingPremium(false);
    }
  }, []);

  const setDevPremiumOverride = useCallback((value: DevPremiumOverride) => {
    setDevPremiumOverrideState(value);
    // 例外は握りつぶして UI 側の切替を優先する
    AsyncStorage.setItem(
      DEV_PREMIUM_OVERRIDE_KEY,
      value === null ? 'null' : value ? 'true' : 'false'
    ).catch(() => {});
  }, []);

  // 起動直後に override が未ロードの間は「通常判定」に寄せてチラつきを防ぐ
  const resolvedDevOverride: DevPremiumOverride = devOverrideLoaded ? devPremiumOverride : null;

  const effectivePremium =
    resolvedDevOverride === null ? DEV_FORCE_PREMIUM_UNLOCK || isPremium : resolvedDevOverride;
  const value: PremiumContextValue = useMemo(
    () => ({
      isPremium,
      isLoadingPremium,
      lastPremiumError,
      currentOffering,
      currentPackage,
      localizedPriceText,
      purchasePremium,
      restorePremium,
      refreshPremiumStatus,
      devPremiumOverride: resolvedDevOverride,
      setDevPremiumOverride,
      effectivePremium,
    }),
    [
      isPremium,
      isLoadingPremium,
      lastPremiumError,
      currentOffering,
      currentPackage,
      localizedPriceText,
      purchasePremium,
      restorePremium,
      refreshPremiumStatus,
      resolvedDevOverride,
      setDevPremiumOverride,
      effectivePremium,
    ]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return ctx;
}
