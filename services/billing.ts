import { Alert, Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

export const BILLING_ENTITLEMENT_ID = 'premium';
export const BILLING_OFFERING_ID = 'default';
// App Store Connect の Product ID（non-consumable）
export const BILLING_PRODUCT_ID = 'kodomo_kimochi_premium';
export const BILLING_FALLBACK_PRICE_TEXT = '--';
// RevenueCat / Store setup notes:
// - entitlement: premium
// - offering: default
// - product: kodomo_kimochi_premium
// - Display copy should use RevenueCat's localized price (fallback allowed).
// - Expo Go ではネイティブ課金が使えないため configure が失敗しうる（開発ビルド / TestFlight で検証すること）。

let initialized = false;
/** 並行呼び出しで configure が二重実行されないようにする */
let initPromise: Promise<void> | null = null;

export type BillingDebugSnapshot = {
  updatedAt: number;
  offeringsAllKeys: string[];
  offeringsCurrentId: string | null;
  offeringPackagesProductIds: string[];
  storeProductsCount: number | null;
  hasGetOfferingsError: boolean;
  getOfferingsErrorMessage: string | null;
  hasGetPremiumPricingSafeError: boolean;
  getPremiumPricingSafeErrorMessage: string | null;
};

let billingDebugSnapshot: BillingDebugSnapshot = {
  updatedAt: Date.now(),
  offeringsAllKeys: [],
  offeringsCurrentId: null,
  offeringPackagesProductIds: [],
  storeProductsCount: null,
  hasGetOfferingsError: false,
  getOfferingsErrorMessage: null,
  hasGetPremiumPricingSafeError: false,
  getPremiumPricingSafeErrorMessage: null,
};

export function getBillingDebugSnapshot(): BillingDebugSnapshot {
  return billingDebugSnapshot;
}

export type BillingErrorCode =
  | 'init_failed'
  | 'product_not_found'
  | 'user_cancelled'
  | 'network_error'
  | 'purchase_failed'
  | 'restore_failed'
  | 'unknown';

export class BillingError extends Error {
  code: BillingErrorCode;

  constructor(code: BillingErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function getPlatformApiKey(): string {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_API_KEY_IOS
      : process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;
  if (!key) {
    throw new BillingError('init_failed', 'RevenueCat API key is missing for this platform.');
  }
  return key;
}

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
  return !!info.entitlements.active[BILLING_ENTITLEMENT_ID];
}

function toBillingError(err: unknown, fallback: BillingErrorCode): BillingError {
  if (err instanceof BillingError) return err;
  const purchasesErr = err as PurchasesError | undefined;
  const codeRaw = (purchasesErr as { code?: string | number } | undefined)?.code;
  const message = err instanceof Error ? err.message : 'Unknown billing error';
  const codeText = typeof codeRaw === 'string' ? codeRaw.toLowerCase() : String(codeRaw ?? '');

  if (
    codeText.includes('purchasecancelled') ||
    codeText.includes('purchasecancel') ||
    codeText.includes('user_cancelled')
  ) {
    return new BillingError('user_cancelled', message);
  }
  if (codeText.includes('network') || codeText.includes('offline') || codeText.includes('timeout')) {
    return new BillingError('network_error', message);
  }
  return new BillingError(fallback, message);
}

function findPremiumPackage(offering: PurchasesOffering): PurchasesPackage | null {
  return (
    offering.availablePackages.find((pkg) => pkg.product.identifier === BILLING_PRODUCT_ID) ?? null
  );
}

export type PremiumPricingResult = {
  currentOffering: PurchasesOffering | null;
  currentPackage: PurchasesPackage | null;
  localizedPriceText: string | null;
};

function getLocalizedPriceTextFromPackage(pkg: PurchasesPackage | null): string | null {
  if (!pkg) return null;

  // react-native-purchases の型が環境により差が出るため、ここは安全寄りに参照する
  const p: any = pkg;
  const product: any = p.product ?? {};
  const storeProduct: any = p.storeProduct ?? product.storeProduct ?? product;

  const candidates: unknown[] = [
    storeProduct?.localizedPriceString,
    product?.localizedPriceString,
    storeProduct?.priceString,
    product?.priceString,
    storeProduct?.localizedPrice,
    product?.localizedPrice,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
    if (typeof c === 'number' && Number.isFinite(c)) return String(c);
  }

  return null;
}

async function getPremiumOfferingAndPackage(): Promise<{
  offering: PurchasesOffering | null;
  pkg: PurchasesPackage | null;
}> {
  let offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>;
  try {
    offerings = await Purchases.getOfferings();
  } catch (error) {
    console.error('GET_OFFERINGS_ERROR', error);
    throw error;
  }

  // 1) current offering 優先 → 2) default offering → 3) all の先頭 offering（ID 不一致時の救済）
  const fallbackOfferingById = offerings.all?.[BILLING_OFFERING_ID] ?? null;
  const firstOfferingFromAll = (() => {
    const all = offerings.all ?? {};
    const firstKey = Object.keys(all)[0];
    return firstKey ? all[firstKey] ?? null : null;
  })();

  const candidates: Array<{ label: string; offering: PurchasesOffering | null }> = [
    { label: 'current', offering: offerings.current ?? null },
    { label: `all.${BILLING_OFFERING_ID}`, offering: fallbackOfferingById },
    { label: 'all.first', offering: firstOfferingFromAll },
  ];

  for (const c of candidates) {
    const off = c.offering;
    if (!off) continue;
    const pkg = findPremiumPackage(off);
    if (pkg) {
      return { offering: off, pkg };
    }
  }

  // 見つからない（Offerings 空 / Product ID 不一致 / RC 未設定など）
  const anyOffering = offerings.current ?? fallbackOfferingById ?? firstOfferingFromAll;
  if (anyOffering) {
    return { offering: anyOffering, pkg: null };
  }
  return { offering: null, pkg: null };
}

/**
 * RevenueCatから premium package の価格（localized price string）を取得する。
 * 取得できない場合は localizedPriceText を null にする（UI側でフォールバック可能）。
 */
export async function getPremiumPricingSafe(): Promise<PremiumPricingResult> {
  await initializeBilling();
  try {
    const { offering, pkg } = await getPremiumOfferingAndPackage();
    return {
      currentOffering: offering,
      currentPackage: pkg,
      localizedPriceText: getLocalizedPriceTextFromPackage(pkg),
    };
  } catch (error) {
    console.error('GET_PREMIUM_PRICING_SAFE_ERROR', error);
    return {
      currentOffering: null,
      currentPackage: null,
      localizedPriceText: null,
    };
  }
}

/**
 * RevenueCat setup（アプリ起動時に1回相当。並行呼び出しは同一 Promise に合流）。
 * Expo SDK 54 + react-native-purchases 9.x では Purchases.configure({ apiKey }) で問題ない。
 */
export async function initializeBilling(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        Purchases.configure({ apiKey: getPlatformApiKey() });
        initialized = true;
      } catch (err) {
        console.error('RC ERROR:', err);
        throw toBillingError(err, 'init_failed');
      } finally {
        if (!initialized) initPromise = null;
      }
    })();
  }
  await initPromise;
}

/**
 * Single source of truth: entitlement `premium`.
 */
export async function getCustomerPremiumStatus(): Promise<boolean> {
  await initializeBilling();
  try {
    const info = await Purchases.getCustomerInfo();
    return isPremiumFromCustomerInfo(info);
  } catch (err) {
    console.error('RC ERROR:', err);
    throw toBillingError(err, 'unknown');
  }
}

/**
 * Buy once unlock product.
 */
export async function purchasePremiumUnlock(): Promise<boolean> {
  await initializeBilling();
  try {
    const { pkg } = await getPremiumOfferingAndPackage();
    if (!pkg) {
      throw new BillingError('product_not_found', 'Premium product is not available in offerings.');
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return isPremiumFromCustomerInfo(customerInfo);
  } catch (err) {
    console.error('RC ERROR:', err);
    throw toBillingError(err, 'purchase_failed');
  }
}

/**
 * Restore purchases from store account.
 */
export async function restorePremiumUnlock(): Promise<boolean> {
  await initializeBilling();
  try {
    const info = await Purchases.restorePurchases();
    return isPremiumFromCustomerInfo(info);
  } catch (err) {
    console.error('RC ERROR:', err);
    throw toBillingError(err, 'restore_failed');
  }
}

/**
 * Fallback CTA helper for screens that don't own navigation.
 */
export function openPremium(): void {
  Alert.alert(
    'プレミアム',
    '画面一覧から「プレミアムを見る」（設定など）を開き、内容を確認してから購入できます。',
    [{ text: 'OK' }]
  );
}
