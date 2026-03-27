import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { usePremium } from '@/contexts/PremiumContext';
import {
  addChild,
  getChildrenState,
  MAX_CHILDREN,
  removeChild as removeChildFromStorage,
  renameChild,
  setSelectedChildId,
  type ChildProfile,
} from '@/lib/children';
import { removeAllEmotionHistoryByChildId } from '@/lib/emotion-history';

type ChildContextValue = {
  children: ChildProfile[];
  selectedChildId: string;
  selectedChild: ChildProfile | null;
  canAddChild: boolean;
  maxChildren: number;
  selectChild: (childId: string) => Promise<void>;
  addNewChild: (name?: string) => Promise<boolean>;
  updateChildName: (childId: string, name: string) => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
  reloadChildren: () => Promise<void>;
};

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const { effectivePremium } = usePremium();
  const [childList, setChildList] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildIdState] = useState('');

  const reloadChildren = useCallback(async () => {
    const state = await getChildrenState();
    setChildList(state.children);
    setSelectedChildIdState(state.selectedChildId);
  }, []);

  useEffect(() => {
    reloadChildren();
  }, [reloadChildren]);

  const selectChild = useCallback(async (childId: string) => {
    const next = await setSelectedChildId(childId);
    setChildList(next.children);
    setSelectedChildIdState(next.selectedChildId);
  }, []);

  const addNewChild = useCallback(
    async (name?: string) => {
      if (!effectivePremium) return false;
      const next = await addChild(name);
      setChildList(next.children);
      setSelectedChildIdState(next.selectedChildId);
      return true;
    },
    [effectivePremium]
  );

  const updateChildName = useCallback(async (childId: string, name: string) => {
    const next = await renameChild(childId, name);
    setChildList(next.children);
    setSelectedChildIdState(next.selectedChildId);
  }, []);

  const removeChild = useCallback(
    async (childId: string) => {
      if (childList.length <= 1) return;
      const beforeLength = childList.length;

      const next = await removeChildFromStorage(childId);
      const removed = next.children.length !== beforeLength;

      setChildList(next.children);
      setSelectedChildIdState(next.selectedChildId);

      if (removed) {
        await removeAllEmotionHistoryByChildId(childId);
      }
    },
    [childList.length]
  );

  const selectedChild = useMemo(
    () => childList.find((child) => child.id === selectedChildId) ?? null,
    [childList, selectedChildId]
  );

  const canAddChild = effectivePremium && childList.length < MAX_CHILDREN;

  const value = useMemo(
    () => ({
      children: childList,
      selectedChildId,
      selectedChild,
      canAddChild,
      maxChildren: MAX_CHILDREN,
      selectChild,
      addNewChild,
      updateChildName,
      removeChild,
      reloadChildren,
    }),
    [
      childList,
      selectedChildId,
      selectedChild,
      canAddChild,
      selectChild,
      addNewChild,
      updateChildName,
      removeChild,
      reloadChildren,
    ]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useChild must be used within ChildProvider');
  return ctx;
}
