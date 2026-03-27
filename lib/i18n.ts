import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import jaCommon from '@/locales/ja/common.json';
import enCommon from '@/locales/en/common.json';

import jaHistory from '@/locales/ja/history.json';
import enHistory from '@/locales/en/history.json';

import jaEmotionDetail from '@/locales/ja/emotionDetail.json';
import enEmotionDetail from '@/locales/en/emotionDetail.json';

import jaChildSwitcher from '@/locales/ja/childSwitcher.json';
import enChildSwitcher from '@/locales/en/childSwitcher.json';

import jaEmotionCalendar from '@/locales/ja/emotionCalendar.json';
import enEmotionCalendar from '@/locales/en/emotionCalendar.json';

import jaUpgradeCard from '@/locales/ja/upgradeCard.json';
import enUpgradeCard from '@/locales/en/upgradeCard.json';
import jaResearchNote from '@/locales/ja/researchNote.json';
import enResearchNote from '@/locales/en/researchNote.json';
import jaSettings from '@/locales/ja/settings.json';
import enSettings from '@/locales/en/settings.json';
import jaTabs from '@/locales/ja/tabs.json';
import enTabs from '@/locales/en/tabs.json';
import jaHome from '@/locales/ja/home.json';
import enHome from '@/locales/en/home.json';
import jaPremium from '@/locales/ja/premium.json';
import enPremium from '@/locales/en/premium.json';

export type AppLanguage = 'ja' | 'en';

const resources = {
  ja: {
    translation: {
      common: jaCommon,
      history: jaHistory,
      emotionDetail: jaEmotionDetail,
      childSwitcher: jaChildSwitcher,
      emotionCalendar: jaEmotionCalendar,
      upgradeCard: jaUpgradeCard,
      researchNote: jaResearchNote,
      settings: jaSettings,
      tabs: jaTabs,
      home: jaHome,
      premium: jaPremium,
    },
    /** settings.json をそのまま参照する用（billing などネストが深いキーを確実に解決） */
    settings: jaSettings,
    premium: jaPremium,
    /** history.json を短いキーで参照する用 */
    history: jaHistory,
  },
  en: {
    translation: {
      common: enCommon,
      history: enHistory,
      emotionDetail: enEmotionDetail,
      childSwitcher: enChildSwitcher,
      emotionCalendar: enEmotionCalendar,
      upgradeCard: enUpgradeCard,
      researchNote: enResearchNote,
      settings: enSettings,
      tabs: enTabs,
      home: enHome,
      premium: enPremium,
    },
    settings: enSettings,
    premium: enPremium,
    history: enHistory,
  },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'ja',
    fallbackLng: 'ja',
    ns: ['translation', 'settings', 'premium', 'history'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
  });
}

export function changeLanguage(lang: AppLanguage) {
  return i18n.changeLanguage(lang);
}

export default i18n;

