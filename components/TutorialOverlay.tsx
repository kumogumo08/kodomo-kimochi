import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TUTORIAL_UI } from '@/constants/tutorial-content';

/** 真っ黒にせず、下のUIがうっすら分かる程度のディム */
const DIM = 'rgba(15, 23, 42, 0.4)';

type Props = {
  visible: boolean;
  message: string;
  primaryLabel: typeof TUTORIAL_UI.ok | typeof TUTORIAL_UI.start;
  onPrimary: () => void;
  onSkip?: () => void;
};

/**
 * visible=false のときは null を返し Modal をマウントしない。
 * 複数 Modal の重なり・非表示時のタッチ残留を防ぐため。
 */
export function TutorialOverlay({
  visible,
  message,
  primaryLabel,
  onPrimary,
  onSkip,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.modalRoot} pointerEvents="box-none">
        {/* 全面ディム（Pressable ではなく View でタッチを受けるだけに） */}
        <View style={[styles.dim, StyleSheet.absoluteFill]} pointerEvents="auto" />

        <View
          style={[
            styles.bubbleColumn,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
          pointerEvents="box-none">
          <View style={styles.bubble} accessibilityRole="none">
            <Text style={styles.bubbleText}>{message}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={onPrimary}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}>
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </Pressable>
            {onSkip ? (
              <Pressable
                style={styles.skipBtn}
                onPress={onSkip}
                accessibilityRole="button"
                accessibilityLabel={TUTORIAL_UI.skip}>
                <Text style={styles.skipText}>{TUTORIAL_UI.skip}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  dim: {
    backgroundColor: DIM,
  },
  bubbleColumn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  bubble: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
});
