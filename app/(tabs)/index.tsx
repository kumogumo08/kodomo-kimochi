import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { TutorialOverlay } from '@/components/TutorialOverlay';
import type { Emotion } from '@/constants/emotions';
import { getEmotions } from '@/constants/emotions';
import { TUTORIAL_MESSAGES, TUTORIAL_UI } from '@/constants/tutorial-content';
import { ChildNameChips } from '@/components/ChildNameChips';
import { useTutorial } from '@/contexts/TutorialContext';
import { useChild } from '@/contexts/ChildContext';
import { usePremium } from '@/contexts/PremiumContext';
import { addEmotionToHistory } from '@/lib/emotion-history';

/** 切り分け: true でカードの pressed スタイルを付けない */
const DEBUG_HOME_EMOTION_CARD_NO_PRESSED_STYLE = false;
/** true: 遷移を先にし、履歴保存は後（タッチ状態の引き継ぎ切り分け） */
const HOME_PUSH_EMOTION_BEFORE_HISTORY = true;

const SCREEN_BG = '#FFF8F0';
const LABEL_COLOR = '#1a1a1a';

export default function HomeScreen() {
  const router = useRouter();
  const { effectivePremium } = usePremium();
  const { children, selectedChildId, selectedChild, selectChild, updateChildName } = useChild();
  const { t } = useTranslation();
  const { ready, phase, advance, skip } = useTutorial();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const emotionsForLang = getEmotions();

  const showTutorialHome = ready && phase === 0;

  const selectedIndex = useMemo(
    () => children.findIndex((child) => child.id === selectedChildId),
    [children, selectedChildId]
  );

  const handleSwipe = async (translationX: number) => {
    if (!effectivePremium) return;
    if (children.length <= 1) return;
    if (selectedIndex < 0) return;

    const threshold = 36;
    if (translationX <= -threshold && selectedIndex < children.length - 1) {
      await selectChild(children[selectedIndex + 1].id);
      return;
    }
    if (translationX >= threshold && selectedIndex > 0) {
      await selectChild(children[selectedIndex - 1].id);
    }
  };

  const openRename = () => {
    setNameDraft(selectedChild?.name ?? t('childSwitcher.defaultName'));
    setEditingName(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PanGestureHandler
        enabled={effectivePremium && !editingName && children.length > 1 && !showTutorialHome}
        onEnded={async (event: any) => {
          await handleSwipe(event.nativeEvent.translationX);
        }}
        activeOffsetX={[-12, 12]}
        failOffsetY={[-10, 10]}>
        <View style={styles.gestureWrap}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showTutorialHome}>
            <View style={styles.header}>
              <View style={styles.subtitleWrap}>
                <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
              </View>

              <ChildNameChips
                childrenList={children}
                selectedChild={selectedChild}
                selectedChildId={selectedChildId}
                effectivePremium={effectivePremium}
                selectChild={selectChild}
                onLongPressSelected={openRename}
              />
            </View>

            <View style={styles.grid}>
              {emotionsForLang.map((emotion) => (
                <EmotionCard
                  key={emotion.id}
                  emotion={emotion}
                  noPressedStyle={DEBUG_HOME_EMOTION_CARD_NO_PRESSED_STYLE}
                  onPress={() => {
                    const historyPayload = {
                      emotionId: emotion.id,
                      label: emotion.label,
                      selectedAt: new Date().toISOString(),
                    };
                    if (HOME_PUSH_EMOTION_BEFORE_HISTORY) {
                      router.push({ pathname: '/emotion/[id]', params: { id: emotion.id } });
                      void addEmotionToHistory(historyPayload, selectedChildId).catch(() => {
                        // 保存に失敗しても詳細は開いている
                      });
                    } else {
                      void (async () => {
                        try {
                          await addEmotionToHistory(historyPayload, selectedChildId);
                        } catch {
                          // 保存に失敗しても詳細へ遷移する
                        }
                        router.push({ pathname: '/emotion/[id]', params: { id: emotion.id } });
                      })();
                    }
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </PanGestureHandler>

      <TutorialOverlay
        visible={showTutorialHome}
        message={TUTORIAL_MESSAGES[0]}
        primaryLabel={TUTORIAL_UI.ok}
        onPrimary={() => advance()}
        onSkip={skip}
      />

      <Modal
        transparent
        visible={editingName}
        animationType="fade"
        onRequestClose={() => setEditingName(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingName(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('home.renameModalTitle')}</Text>
            <TextInput
              style={styles.modalInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={20}
              placeholder={t('home.placeholderName')}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingName(false)}>
                <Text style={styles.modalCancel}>{t('home.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!selectedChild) return;
                  await updateChildName(selectedChild.id, nameDraft);
                  setEditingName(false);
                }}
              >
                <Text style={styles.modalSave}>{t('home.save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function EmotionCard({
  emotion,
  onPress,
  noPressedStyle,
}: {
  emotion: Emotion;
  onPress: () => void;
  noPressedStyle?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: emotion.bgColor },
        !noPressedStyle && pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={emotion.label}>
      <View style={styles.imageWrap}>
        <Image
          source={emotion.image}
          style={styles.cardImage}
          contentFit="contain"
        />
      </View>
      <Text style={styles.cardLabel}>{emotion.label}</Text>
    </Pressable>
  );
}

const CARD_GAP = 12;
const COLS = 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  gestureWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 17,
    color: '#7A5C43',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitleWrap: {
    backgroundColor: '#FFF4E8',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F3D9C3',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_GAP / 2,
  },
  card: {
    width: `${100 / COLS}%`,
    paddingHorizontal: CARD_GAP / 2,
    paddingBottom: CARD_GAP,
    minHeight: 200,
    borderRadius: 16,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#FFF',
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 162,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: LABEL_COLOR,
    marginTop: 4,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  modalCancel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSave: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '700',
  },
});
