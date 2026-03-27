# IAP Test Checklist

## Pre-check
- [ ] Dev/production build installed (not Expo Go).
- [ ] `EXPO_PUBLIC_RC_API_KEY_IOS` and `EXPO_PUBLIC_RC_API_KEY_ANDROID` are set.
- [ ] RevenueCat offering `default` contains product `kodomo_kimochi_premium`.
- [ ] Entitlement `premium` is attached.

## Purchase Flow
- [ ] Start with a test user that has not purchased.
- [ ] Open Settings > Premium features.
- [ ] Tap "View Premium" / "プレミアムを見る".
- [ ] Confirm price is shown from localized store pricing if available.
- [ ] Complete purchase in sandbox/test account.
- [ ] Confirm "Premium purchased" state appears immediately.
- [ ] Confirm locked UI becomes available without app restart.

## Restore Flow
- [ ] Reinstall app or use another device with same store account.
- [ ] Tap "Restore purchases".
- [ ] Confirm restore success message.
- [ ] Confirm premium state is active after restore.

## Relaunch Persistence
- [ ] Force close app and re-open.
- [ ] Confirm entitlement state remains premium.

## Feature Unlock Verification
- [ ] Emotion calendar: free account only last 2 weeks; premium account full history.
- [ ] Emotion report analysis: locked when free, visible when premium.
- [ ] Sibling add/manage UI: prompts upgrade when free, works when premium.
- [ ] Memo feature in history: locked when free, save/edit/display when premium.

## Error Handling
- [ ] User-cancelled purchase shows cancellation message.
- [ ] Product missing in offering shows product retrieval error.
- [ ] Network offline shows network error.
- [ ] Initialization failure shows billing init error.
- [ ] Restore failure shows restore error.
- [ ] Unknown errors show fallback message.