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
// RevenueCat / Store setup notes:
// - entitlement: premium
// - offering: default
// - product: kodomo_kimochi_premium
// - Display copy should use RevenueCat's localized price (fallback allowed).

let initialized = false;

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
  const offerings = await Purchases.getOfferings();

  // 1) current offering 優先
  if (offerings.current) {
    const pkg = findPremiumPackage(offerings.current);
    if (pkg) return { offering: offerings.current, pkg };
  }

  // 2) default offering フォールバック
  const fallbackOffering = offerings.all[BILLING_OFFERING_ID] ?? null;
  if (fallbackOffering) {
    const pkg = findPremiumPackage(fallbackOffering);
    if (pkg) return { offering: fallbackOffering, pkg };
  }

  // 見つからない
  if (offerings.current) return { offering: offerings.current, pkg: null };
  if (fallbackOffering) return { offering: fallbackOffering, pkg: null };
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
  } catch {
    return {
      currentOffering: null,
      currentPackage: null,
      localizedPriceText: null,
    };
  }
}

/**
 * RevenueCat setup (run once on app launch).
 */
export async function initializeBilling(): Promise<void> {
  if (initialized) return;
  try {
    Purchases.configure({ apiKey: getPlatformApiKey() });
    initialized = true;
  } catch (err) {
    throw toBillingError(err, 'init_failed');
  }
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
    throw toBillingError(err, 'unknown');
  }
}

/**
 * Buy once unlock product.
 */
export async function purchasePremiumUnlock(): Promise<boolean> {
  await initializeBilling();
  try {
    const { offering, pkg } = await getPremiumOfferingAndPackage();
    const premiumPackage = pkg;
    if (!premiumPackage) {
      throw new BillingError('product_not_found', 'Premium product is not available in offerings.');
    }
    const { customerInfo } = await Purchases.purchasePackage(premiumPackage);
    return isPremiumFromCustomerInfo(customerInfo);
  } catch (err) {
    const mapped = toBillingError(err, 'purchase_failed');
    if (mapped.code === 'user_cancelled') throw mapped;
    throw mapped;
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
