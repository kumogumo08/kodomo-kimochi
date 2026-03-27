import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResearchNote } from '@/components/ResearchNote';
import { getEmotionById } from '@/constants/emotions';
import type { Emotion } from '@/constants/emotions';
import { useTranslation } from 'react-i18next';

const SCREEN_BG = '#FFF9F5';
const TITLE_COLOR = '#1a1a1a';
const HEADING_COLOR = '#252525';
const BODY_COLOR = '#333';
const BORDER_COLOR = 'rgba(0,0,0,0.08)';
const SUCCESS_BG = '#E8F5E9';

function pickRandomSuccessMessage(list: string[], avoid?: string): string {
  if (list.length === 0) return '';
  if (!avoid || list.length === 1) return list[Math.floor(Math.random() * list.length)];
  const others = list.filter((m) => m !== avoid);
  return others[Math.floor(Math.random() * others.length)] ?? list[0];
}

/** 紙吹雪パレット（七色＋バリエーションで密度・派手さ用） */
const CONFETTI_COLORS = [
  '#FF3B30',
  '#FF6B6B',
  '#FF9500',
  '#FFB340',
  '#FFCC00',
  '#FFE066',
  '#34C759',
  '#5AC8FA',
  '#30D158',
  '#007AFF',
  '#64D2FF',
  '#5856D6',
  '#BF5AF2',
  '#FF2D55',
];

const CRACKER_PARTICLE_COUNT = 56;
type CrackerOrigin = { x: number; y: number };

type AccordionId = 'calm' | 'parent' | 'words';

export default function EmotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const emotion = id ? getEmotionById(id) : undefined;
  const successMessages = useMemo(
    () => t('emotionDetail.successMessages', { returnObjects: true }) as string[],
    [t],
  );
  const initialSuccessMessage = successMessages[0] ?? '';
  const [openSections, setOpenSections] = useState<Set<AccordionId>>(new Set());
  const [didComplete, setDidComplete] = useState(false);
  const [currentSuccessMessage, setCurrentSuccessMessage] = useState(initialSuccessMessage);
  const lastSuccessMessageRef = useRef<string>(initialSuccessMessage);
  const [crackerOrigin, setCrackerOrigin] = useState<CrackerOrigin | null>(null);
  const [crackerTick, setCrackerTick] = useState(0);
  const doneButtonRef = useRef<View>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.9)).current;
  const crackerParticles = useRef(
    Array.from({ length: CRACKER_PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      r: new Animated.Value(0),
      o: new Animated.Value(0),
    }))
  ).current;

  const selectedAction = useMemo(() => {
    if (!emotion) return '';
    const list = emotion.actions ?? [];
    if (list.length === 0) return '';
    const index = Math.floor(Math.random() * list.length);
    return list[index] ?? '';
  }, [emotion?.id]);

  const toggleSection = (key: AccordionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onCompletePress = () => {
    const picked = pickRandomSuccessMessage(successMessages, lastSuccessMessageRef.current);
    lastSuccessMessageRef.current = picked;
    setCurrentSuccessMessage(picked);
    const apply = (x: number, y: number) => {
      setCrackerOrigin({ x, y });
      setCrackerTick((t) => t + 1);
      setDidComplete(true);
    };
    const ref = doneButtonRef.current as unknown as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };
    if (ref?.measureInWindow) {
      ref.measureInWindow((wx, wy, w, h) => apply(wx + w / 2, wy + h / 2));
    } else {
      const { width, height } = Dimensions.get('window');
      apply(width / 2, height * 0.5);
    }
  };

  const onAgainPress = () => {
    setCrackerOrigin(null);
    setDidComplete(false);
  };

  useEffect(() => {
    if (!didComplete) return;
    celebrationOpacity.setValue(0);
    celebrationScale.setValue(0.9);
    Animated.parallel([
      Animated.timing(celebrationOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(celebrationScale, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [didComplete, celebrationOpacity, celebrationScale]);

  useEffect(() => {
    if (!crackerOrigin || crackerTick === 0) return;
    const COUNT = CRACKER_PARTICLE_COUNT;
    const particles = crackerParticles;

    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.r.setValue(0);
      p.o.setValue(1);
    });

    const anims: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      const angle = ((-140 + Math.random() * 100) * Math.PI) / 180;
      const speed = 140 + Math.random() * 140;
      const wind = (Math.random() - 0.5) * 40;
      const dx = Math.cos(angle) * speed + wind;
      const dy = Math.sin(angle) * speed;
      const gravity = 220 + Math.random() * 220;
      const rot = Math.random() * 360 - 180;

      anims.push(
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: dx,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.y, {
              toValue: dy,
              duration: 360,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: dy + gravity,
              duration: 540,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.r, {
            toValue: rot,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.o, { toValue: 1, duration: 40, useNativeDriver: true }),
            Animated.timing(p.o, {
              toValue: 0,
              duration: 420,
              delay: 520,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    }
    Animated.parallel(anims).start();
  }, [crackerOrigin, crackerTick, crackerParticles]);

  if (!emotion) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <Text style={styles.errorText}>{t('emotionDetail.notFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('emotionDetail.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ① 上部：子供向け */}
        <View style={[styles.imageWrap, { backgroundColor: emotion.bgColor }]}>
          <Image
            source={emotion.image}
            style={styles.detailImage}
            contentFit="contain"
          />
        </View>
        <Text style={styles.emotionLabelSmall}>{emotion.label}</Text>

        {/* ② 共感メッセージ */}
        <View style={styles.empathyMainWrap}>
          <Text style={styles.empathyMainText}>{emotion.empathyMain}</Text>
        </View>

        {/* ③ いまやること + できた！ */}
        {!didComplete ? (
          <>
            <View style={styles.actionBox}>
              <Text style={styles.actionBoxLabel}>{t('emotionDetail.actionBoxLabel')}</Text>
              <Text style={styles.actionBoxText}>{selectedAction}</Text>
            </View>
            <View ref={doneButtonRef} collapsable={false}>
              <Pressable
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.doneButtonPressed,
                ]}
                onPress={onCompletePress}
                accessibilityRole="button"
                accessibilityLabel={t('emotionDetail.done')}>
                <Text style={styles.doneButtonText}>{t('emotionDetail.done')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.celebrationSpacer} />
        )}

        {/* ④ 親向けアコーディオン */}
        <View style={styles.accordionWrap}>
          <AccordionRow
            id="calm"
            title={t('emotionDetail.accordion.calmTitle')}
            open={openSections.has('calm')}
            onPress={() => toggleSection('calm')}
            content={
              <View style={styles.accordionContent}>
                {emotion.parentActions.map((action, i) => (
                  <Text key={i} style={styles.accordionBodyItem}>
                    ・{action}
                  </Text>
                ))}
              </View>
            }
          />
          <AccordionRow
            id="parent"
            title={t('emotionDetail.accordion.parentTitle')}
            open={openSections.has('parent')}
            onPress={() => toggleSection('parent')}
            content={
              <View style={styles.accordionContent}>
                <Text style={styles.accordionBodyText}>
                  {emotion.parentGuide}
                </Text>
              </View>
            }
          />
          <AccordionRow
            id="words"
            title={t('emotionDetail.accordion.wordsTitle')}
            open={openSections.has('words')}
            onPress={() => toggleSection('words')}
            content={
              <View style={styles.accordionContent}>
                {emotion.empathy.map((text, i) => (
                  <Text key={i} style={styles.accordionBodyItem}>
                    ・{text}
                  </Text>
                ))}
              </View>
            }
          />
        </View>

        {emotion.evidenceNote ? (
          <ResearchNote evidenceNote={emotion.evidenceNote} />
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 紙吹雪はスクロールより前面（クラッカーがしっかり見える） */}
      {crackerOrigin && (
        <View style={styles.crackerOverlay} pointerEvents="none">
          <View style={[styles.crackerOrigin, { left: crackerOrigin.x, top: crackerOrigin.y }]}>
            {crackerParticles.map((p, idx) => {
              const rotate = p.r.interpolate({
                inputRange: [-180, 180],
                outputRange: ['-180deg', '180deg'],
              });
              const isDot = idx % 5 === 0;
              const sizeVar = idx % 4;
              const w = isDot ? 4 + (sizeVar % 3) : 5 + (idx % 4);
              const h = isDot ? 4 + (sizeVar % 3) : 10 + (idx % 8);
              const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.crackerPiece,
                    {
                      width: w,
                      height: h,
                      borderRadius: isDot ? 999 : 2,
                      backgroundColor: color,
                      opacity: p.o,
                      transform: [
                        { translateX: p.x },
                        { translateY: p.y },
                        { rotate },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* 成功メッセージ・もういちどは最前面。外側タップで閉じる */}
      {didComplete && (
        <Animated.View
          style={[styles.successOverlay, { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }]}
          pointerEvents="box-none">
          <Pressable style={styles.successOverlayPressable} onPress={onAgainPress}>
            <Pressable style={styles.successCardWrap} onPress={() => {}}>
              <View style={styles.successCard}>
                <Text style={styles.celebrationMessage}>{currentSuccessMessage}</Text>
                <Pressable
                  onPress={onAgainPress}
                  style={styles.againButton}
                  accessibilityLabel={t('emotionDetail.again')}>
                  <Text style={styles.againButtonText}>{t('emotionDetail.again')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function AccordionRow({
  id,
  title,
  open,
  onPress,
  content,
}: {
  id: AccordionId;
  title: string;
  open: boolean;
  onPress: () => void;
  content: React.ReactNode;
}) {
  return (
    <View style={styles.accordionItem}>
      <Pressable
        style={styles.accordionHeader}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}>
        <Text style={styles.accordionChevron}>{open ? '▲' : '▼'}</Text>
        <Text style={styles.accordionTitle}>{title}</Text>
      </Pressable>
      {open && content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: HEADING_COLOR,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  imageWrap: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 180,
    borderRadius: 12,
  },
  emotionLabelSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: TITLE_COLOR,
    marginBottom: 24,
    textAlign: 'center',
  },
  empathyMainWrap: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empathyMainText: {
    fontSize: 26,
    fontWeight: '700',
    color: TITLE_COLOR,
    textAlign: 'center',
    lineHeight: 38,
  },
  actionBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  actionBoxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BODY_COLOR,
    marginBottom: 8,
  },
  actionBoxText: {
    fontSize: 20,
    fontWeight: '700',
    color: TITLE_COLOR,
    lineHeight: 30,
  },
  doneButton: {
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginBottom: 28,
    minWidth: 200,
    alignItems: 'center',
  },
  doneButtonPressed: {
    opacity: 0.9,
  },
  doneButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  crackerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  crackerOrigin: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  crackerPiece: {
    position: 'absolute',
  },
  celebrationSpacer: {
    minHeight: 220,
    marginBottom: 28,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlayPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCardWrap: {},
  successCard: {
    backgroundColor: SUCCESS_BG,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    minWidth: 260,
  },
  celebrationMessage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 16,
    textAlign: 'center',
    zIndex: 1,
  },
  againButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  againButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  accordionWrap: {
    gap: 0,
  },
  accordionItem: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accordionChevron: {
    fontSize: 12,
    color: BODY_COLOR,
    marginRight: 8,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: HEADING_COLOR,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  accordionBodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: BODY_COLOR,
  },
  accordionBodyItem: {
    fontSize: 15,
    lineHeight: 24,
    color: BODY_COLOR,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: BODY_COLOR,
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 24,
  },
});
