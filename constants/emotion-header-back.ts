/**
 * emotion/[id] のカスタム headerLeft（戻る）用配色。
 * ナビヘッダ・ページ背景とのコントラストを light / dark で確保する。
 */
export const EMOTION_HEADER_BACK = {
  light: {
    label: '#252525',
    /** アプリの暖色トーンに寄せた柔らかいチップ */
    background: 'rgba(255, 249, 245, 0.98)',
    border: 'rgba(0, 0, 0, 0.1)',
    pressedBackground: 'rgba(0, 0, 0, 0.07)',
  },
  dark: {
    /** 白系でヘッダの暗い背景から浮かせる */
    label: '#F9FAFB',
    background: 'rgba(255, 255, 255, 0.16)',
    border: 'rgba(255, 255, 255, 0.22)',
    pressedBackground: 'rgba(255, 255, 255, 0.28)',
  },
} as const;
