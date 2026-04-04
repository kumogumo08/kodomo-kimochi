import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { EMOTION_HEADER_BACK } from '@/constants/emotion-header-back';
import { getEmotionById } from '@/constants/emotions';
import { TUTORIAL_MESSAGES, TUTORIAL_UI } from '@/constants/tutorial-content';
import { useTutorial } from '@/contexts/TutorialContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';

const SCREEN_BG = '#FFF9F5';
const TITLE_COLOR = '#1a1a1a';
const HEADING_COLOR = '#252525';
const BODY_COLOR = '#333';
const BORDER_COLOR = 'rgba(0,0,0,0.08)';
const SUCCESS_BG = '#E8F5E9';

/** 切り分け: true で詳細のチュートリアル Modal を出さない */
const DEBUG_DISABLE_DETAIL_TUTORIAL_OVERLAY = false;
/** false にすると React Navigation 標準の戻るボタン（切り分け用） */
const USE_CUSTOM_EMOTION_HEADER_BACK = true;

function EmotionDetailHeaderBack() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useMemo(
    () => EMOTION_HEADER_BACK[colorScheme === 'dark' ? 'dark' : 'light'],
    [colorScheme],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('emotionDetail.back')}
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [
        styles.emotionHeaderBackChip,
        {
          backgroundColor: pressed ? colors.pressedBackground : colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.emotionHeaderBackLabel, { color: colors.label }]}>{t('emotionDetail.back')}</Text>
    </Pressable>
  );
}

function pickRandomSuccessMessage(list: string[], avoid?: string): string {
  if (list.length === 0) return '';
  if (!avoid || list.length === 1) return list[Math.floor(Math.random() * list.length)];
  const others = list.filter((m) => m !== avoid);
  return others[Math.floor(Math.random() * others.length)] ?? list[0];
}

/** 紙吹雪パレット（白系・パステルを足して自然な混ざりに） */
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
  '#FFFFFF',
  '#FFF8F5',
  '#F5F5F7',
  '#E8E8ED',
  'rgba(255,255,255,0.88)',
];

/**
 * 紙吹雪チューニング（達成感・ひらひら感とパフォーマンスのバランス）
 * - 数を上げすぎない（~80前後）／動きの質と長めの寿命を優先
 */
const CRACKER_PARTICLE_COUNT = 90;
/** ボタン中心より上にずらして「少し上から舞う」 */
const CRACKER_ORIGIN_Y_OFFSET_PX = 84;
const DEG2RAD = Math.PI / 180;
/** 合計時間のうち「上に飛ぶ」分は apexT で制御（数値は totalMs の比率用） */
const CRACKER_RISE_MS = 180;
const CRACKER_FALL_MS = 1620;
const CRACKER_TOTAL_MS = CRACKER_RISE_MS + CRACKER_FALL_MS;
/** 横：第1段を全体の約15%＝0.15〜0.25s相当で一気に拡散、2〜3段は小さな揺れ（合計 CRACKER_TOTAL_MS） */
const CRACKER_X_PHASE_MS = [180, 700, 920] as const;
/** 消え始めまで長め（合計 = CRACKER_TOTAL_MS で他トラックと同期） */
const CRACKER_OPACITY_IN_MS = 48;
const CRACKER_OPACITY_HOLD_MS = 1020;
const CRACKER_OPACITY_OUT_MS = CRACKER_TOTAL_MS - CRACKER_OPACITY_IN_MS - CRACKER_OPACITY_HOLD_MS;

/** 初速の3段階（発射の強弱） */
const CRACKER_SPEED_GROUP = [1.02, 1.18, 1.42] as const;

type CrackerOrigin = { x: number; y: number };

/** Y は 0→1 の progress のみアニメし、translateY は interpolate で連続軌道（頂点で停止しない） */
type ConfettiParticlePlan = {
  totalMs: number;
  msX0: number;
  msX1: number;
  msX2: number;
  msOpIn: number;
  msOpHold: number;
  msOpOut: number;
  dy: number;
  gravity: number;
  /** 軌道上の「最上点」に相当する正規化時間 0–1 */
  apexT: number;
  posX1: number;
  posX2: number;
  posX3: number;
  /** 落下中も止まらず回る（1本の linear） */
  rot: number;
};

type AccordionId = 'calm' | 'parent' | 'words';

export default function EmotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { ready, phase, advance, skip, complete } = useTutorial();
  const emotion = id ? getEmotionById(id) : undefined;

  const stackScreenOptions = useMemo(
    () =>
      USE_CUSTOM_EMOTION_HEADER_BACK
        ? {
            headerBackVisible: false as const,
            headerLeft: () => <EmotionDetailHeaderBack />,
          }
        : {},
    [],
  );

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
      setCrackerOrigin({ x, y: y - CRACKER_ORIGIN_Y_OFFSET_PX });
      setCrackerTick((t) => t + 1);
      setDidComplete(true);
    };
    const ref = doneButtonRef.current as unknown as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };
    if (ref?.measureInWindow) {
      ref.measureInWindow((wx, wy, w, h) => apply(wx + w / 2, wy + h / 2));
    } else {
      const { width, height } = Dimensions.get('window');
      apply(width / 2, height * 0.46);
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
        easing: Easing.out(Easing.cubic),
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

  const confettiPlan = useMemo((): ConfettiParticlePlan[] | null => {
    if (!crackerOrigin || crackerTick === 0) return null;
    const xPhaseSum = CRACKER_X_PHASE_MS[0] + CRACKER_X_PHASE_MS[1] + CRACKER_X_PHASE_MS[2];
    const plans: ConfettiParticlePlan[] = [];

    for (let i = 0; i < CRACKER_PARTICLE_COUNT; i++) {
      const speedGroup = CRACKER_SPEED_GROUP[i % CRACKER_SPEED_GROUP.length];
      const tMul = 0.86 + Math.random() * 0.24;
      const fallVar = 0.82 + Math.random() * 0.36;
      const riseMs = CRACKER_RISE_MS * tMul;
      const fallMs = CRACKER_FALL_MS * tMul * fallVar;
      const totalMs = riseMs + fallMs;

      const msX0 = Math.round((CRACKER_X_PHASE_MS[0] / xPhaseSum) * totalMs);
      const msX1 = Math.round((CRACKER_X_PHASE_MS[1] / xPhaseSum) * totalMs);
      const msX2 = Math.max(0, Math.round(totalMs - msX0 - msX1));
      const msOpIn = Math.round((CRACKER_OPACITY_IN_MS / CRACKER_TOTAL_MS) * totalMs);
      const msOpHold = Math.round((CRACKER_OPACITY_HOLD_MS / CRACKER_TOTAL_MS) * totalMs);
      const msOpOut = Math.max(0, Math.round(totalMs - msOpIn - msOpHold));

      const angle = (-128 + Math.random() * 76) * DEG2RAD;
      const speed = (240 + Math.random() * 240) * speedGroup;
      const wind = (Math.random() - 0.5) * 205;
      const dx = Math.cos(angle) * speed + wind;
      const dy = Math.sin(angle) * speed * 1.12;
      const gravity = (168 + Math.random() * 188) * (0.94 + speedGroup * 0.05);

      const spinDir = Math.random() < 0.5 ? -1 : 1;
      const spinAmt = 0.85 + Math.random() * 0.75;
      const rot = (Math.random() - 0.5) * 680 * spinAmt * spinDir;

      const sway = (Math.random() - 0.5) * 125;
      /** 第1段：ほぼ最終拡散まで一気に（バン！） */
      const burstX = dx * (0.55 + Math.random() * 0.18) + sway * 0.55;
      const posX1 = burstX;
      /** 2〜3段：落下中の小さな左右揺れ（大きくは動かさない） */
      const wobble = 20 + Math.random() * 36;
      const posX2 = burstX + (Math.random() - 0.5) * wobble * 2;
      const posX3 = burstX + (Math.random() - 0.5) * wobble * 1.85;

      /**
       * 軌道の山までの正規化時間を短く（≈0.15〜0.25s / totalMs）→「ふわっと上がる」時間を削る
       */
      const apexT = 0.075 + Math.random() * 0.065;

      plans.push({
        totalMs,
        msX0,
        msX1,
        msX2,
        msOpIn,
        msOpHold,
        msOpOut,
        dy,
        gravity,
        apexT,
        posX1,
        posX2,
        posX3,
        rot,
      });
    }
    return plans;
  }, [crackerOrigin, crackerTick]);

  useEffect(() => {
    if (!confettiPlan || !crackerOrigin) return;
    const particles = crackerParticles;

    const stopAllParticleValues = () => {
      for (let i = 0; i < CRACKER_PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x.stopAnimation();
        p.y.stopAnimation();
        p.r.stopAnimation();
        p.o.stopAnimation();
      }
    };

    stopAllParticleValues();

    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.r.setValue(0);
      p.o.setValue(1);
    });

    const anims = confettiPlan.map((plan, i) => {
      const p = particles[i];
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(p.x, {
            toValue: plan.posX1,
            duration: plan.msX0,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: plan.posX2,
            duration: plan.msX1,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: plan.posX3,
            duration: plan.msX2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.y, {
          toValue: 1,
          duration: plan.totalMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(p.r, {
          toValue: plan.rot,
          duration: plan.totalMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.o, { toValue: 1, duration: plan.msOpIn, useNativeDriver: true }),
          Animated.timing(p.o, { toValue: 1, duration: plan.msOpHold, useNativeDriver: true }),
          Animated.timing(p.o, {
            toValue: 0,
            duration: plan.msOpOut,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    /**
     * 外側の Animated.parallel(90) を避ける。
     * 親 composite の stop が子を再帰停止し、ネイティブ側でスタックオーバーフローになる事例があるため、
     * 粒子ごとに個別 start する。
     */
    anims.forEach((anim) => anim.start());

    return () => {
      stopAllParticleValues();
    };
  }, [confettiPlan, crackerOrigin]);

  /** 詳細のチュートリアルは排他 1 ステップのみ（Modal 重複マウント防止） */
  const detailTutorialStep = useMemo((): 1 | 2 | 3 | 4 | null => {
    if (!ready) return null;
    if (phase === 1 && !didComplete) return 1;
    if (phase === 2 && !didComplete) return 2;
    if (phase === 3 && didComplete) return 3;
    if (phase === 4 && didComplete) return 4;
    return null;
  }, [ready, phase, didComplete]);

  /**
   * スタックが同じ画面インスタンスを再利用すると didComplete などが残り、
   * 2 回目入場で phase と組み合わさって Overlay が再び有効になりヘッダーが塞がる。
   * フォーカスを失うたび（戻る含む）ローカル状態をリセットする。
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        setDidComplete(false);
        setCrackerOrigin(null);
        setCrackerTick(0);
        setOpenSections(new Set());
        setCurrentSuccessMessage(initialSuccessMessage);
        lastSuccessMessageRef.current = initialSuccessMessage;
        celebrationOpacity.setValue(0);
        celebrationScale.setValue(0.9);
      };
    }, [id, initialSuccessMessage, celebrationOpacity, celebrationScale])
  );

  const handleFinalStart = async () => {
    try {
      await complete();
    } catch (e) {
      console.warn('[EmotionDetail] handleFinalStart: complete failed', e);
    } finally {
      onAgainPress();
      router.back();
    }
  };

  if (!emotion) {
    return (
      <>
        <Stack.Screen options={stackScreenOptions} />
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
          <Text style={styles.errorText}>{t('emotionDetail.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('emotionDetail.back')}</Text>
          </Pressable>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={stackScreenOptions} />
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
      {crackerOrigin && confettiPlan && (
        <View style={styles.crackerOverlay} pointerEvents="none">
          <View style={[styles.crackerOrigin, { left: crackerOrigin.x, top: crackerOrigin.y }]}>
            {crackerParticles.map((p, idx) => {
              const plan = confettiPlan[idx];
              const translateY = p.y.interpolate({
                inputRange: [0, plan.apexT, 1],
                outputRange: [0, plan.dy, plan.dy + plan.gravity],
                extrapolate: 'clamp',
              });
              const rotate = p.r.interpolate({
                inputRange: [-680, 680],
                outputRange: ['-680deg', '680deg'],
              });
              const mix = ((idx * 92837111) ^ (crackerTick * 7919)) >>> 0;
              const uW = (mix % 55) / 100;
              const uH = ((mix >>> 8) % 55) / 100;
              const isDot = idx % 4 === 0;
              const baseW = isDot ? 7 : 8;
              const baseH = isDot ? 7 : 14;
              const w = Math.max(3, Math.round(baseW * (0.72 + uW * 0.55)));
              const h = Math.max(3, Math.round(baseH * (0.72 + uH * 0.52)));
              const color =
                CONFETTI_COLORS[(idx + (mix % 13) + (crackerTick % 5)) % CONFETTI_COLORS.length];
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
                        { translateY },
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

      {!DEBUG_DISABLE_DETAIL_TUTORIAL_OVERLAY && detailTutorialStep !== null ? (
        <TutorialOverlay
          visible
          message={TUTORIAL_MESSAGES[detailTutorialStep]}
          primaryLabel={detailTutorialStep === 4 ? TUTORIAL_UI.start : TUTORIAL_UI.ok}
          onPrimary={() => {
            if (detailTutorialStep === 4) void handleFinalStart();
            else advance();
          }}
          onSkip={skip}
        />
      ) : null}
    </SafeAreaView>
    </>
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
  /** カスタム headerLeft：ピル型チップ（色は EMOTION_HEADER_BACK 参照） */
  emotionHeaderBackChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 36,
  },
  emotionHeaderBackLabel: {
    fontSize: 17,
    fontWeight: '600',
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
