import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearTutorialCompleted,
  getTutorialCompleted,
  setTutorialCompleted,
} from '@/lib/tutorial-storage';

type TutorialContextValue = {
  /** ストレージ読込完了 */
  ready: boolean;
  /** チュートリアル対象（未完了） */
  active: boolean;
  /** 0..4。完了時は null */
  phase: number | null;
  advance: () => void;
  skip: () => Promise<void>;
  complete: () => Promise<void>;
  /** 設定の「やり直し」用 */
  resetForDev: () => Promise<void>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const done = await getTutorialCompleted();
      if (!cancelled) {
        if (done) setPhase(null);
        else setPhase(0);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const advance = useCallback(() => {
    setPhase((p) => {
      if (p === null) return null;
      if (p >= 4) return p;
      return p + 1;
    });
  }, []);

  const skip = useCallback(async () => {
    try {
      await setTutorialCompleted();
    } catch (e) {
      console.warn('[TutorialContext] skip: setTutorialCompleted threw', e);
    } finally {
      setPhase(null);
    }
  }, []);

  const complete = useCallback(async () => {
    try {
      await setTutorialCompleted();
    } catch (e) {
      console.warn('[TutorialContext] complete: setTutorialCompleted threw', e);
    } finally {
      setPhase(null);
    }
  }, []);

  const resetForDev = useCallback(async () => {
    try {
      await clearTutorialCompleted();
    } catch (e) {
      console.warn('[TutorialContext] resetForDev: clearTutorialCompleted threw', e);
    } finally {
      setPhase(0);
    }
  }, []);

  const active = ready && phase !== null;

  const value = useMemo(
    () => ({
      ready,
      active,
      phase,
      advance,
      skip,
      complete,
      resetForDev,
    }),
    [ready, active, phase, advance, skip, complete, resetForDev]
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return ctx;
}
