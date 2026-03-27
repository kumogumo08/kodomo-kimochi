# IAP Setup (Expo + RevenueCat)

## 1) Packages
- `react-native-purchases` is required (already added).

## 2) Environment Variables
Set these in local `.env` and in EAS secrets:

- `EXPO_PUBLIC_RC_API_KEY_IOS`
- `EXPO_PUBLIC_RC_API_KEY_ANDROID`

Reference template: `.env.example`.

## 3) RevenueCat
- Entitlement ID: `premium`
- Offering ID: `default`
- Product ID: `kodomo_kimochi_premium`

Create one offering (`default`) and include the above product.
Attach the product to entitlement `premium`.

## 4) App Store Connect (iOS)
- Create **Non-Consumable IAP**.
- Product ID: `kodomo_kimochi_premium`
- Set Japanese price point equivalent to ~480 JPY.
- Complete screenshots/metadata/review info for IAP.

## 5) Google Play Console (Android)
- Create **One-time product**.
- Product ID: `kodomo_kimochi_premium`
- Treat as non-consumable unlock.
- Set Japanese price equivalent to ~480 JPY.

## 6) EAS Build Notes
- Use development build / production build (not Expo Go) for native IAP testing.
- Ensure store listing and app identifiers are correctly linked with RevenueCat app.

## 7) App-side Behavior
- Source of truth is RevenueCat entitlement `premium`.
- On app launch: initialize RevenueCat and fetch `CustomerInfo`.
- After purchase/restore: re-fetch `CustomerInfo` and update UI immediately.
- Display copy should use localized store pricing when available.
- Final billing amount always follows store price points.