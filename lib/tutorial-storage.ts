import AsyncStorage from '@react-native-async-storage/async-storage';

/** インタラクティブチュートリアル完了（新） */
const TUTORIAL_DONE_KEY = '@kodomo_kimochi/interactive_tutorial_v1_done';

/** 旧オンボーディング完了（移行用） */
const LEGACY_ONBOARDING_KEY = '@kodomo_kimochi/onboarding_completed_v1';
const LEGACY_FIRST_COACH_KEY = '@kodomo_kimochi/first_session_emotion_coach_v1';

export async function getTutorialCompleted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(TUTORIAL_DONE_KEY);
    if (v === '1') return true;
    const legacy = await AsyncStorage.getItem(LEGACY_ONBOARDING_KEY);
    if (legacy === '1') {
      await setTutorialCompleted();
      try {
        await AsyncStorage.removeItem(LEGACY_FIRST_COACH_KEY);
      } catch (e) {
        console.warn('[tutorial-storage] remove LEGACY_FIRST_COACH_KEY failed', e);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function setTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch (e) {
    console.warn('[tutorial-storage] setTutorialCompleted failed', e);
  }
}

/**
 * チュートリアル完了フラグを消す（開発リセット・再表示テスト用）。
 * 旧オンボーディング・初回コーチ用キーもまとめて削除する。
 */
export async function clearTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      TUTORIAL_DONE_KEY,
      LEGACY_ONBOARDING_KEY,
      LEGACY_FIRST_COACH_KEY,
    ]);
  } catch (e) {
    console.warn('[tutorial-storage] clearTutorialCompleted failed', e);
  }
}
