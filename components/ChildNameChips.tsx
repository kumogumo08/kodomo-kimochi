import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ChildProfile } from '@/lib/children';

export type ChildNameChipsProps = {
  childrenList: ChildProfile[];
  selectedChild: ChildProfile | null;
  selectedChildId: string;
  effectivePremium: boolean;
  selectChild: (childId: string) => Promise<void>;
  /** 選択中チップの長押し（ホームの改名など）。未指定なら長押し無効 */
  onLongPressSelected?: () => void;
};

/**
 * ホーム・履歴で共通の子ども名チップ行。ChildContext の選択状態と連動する。
 */
export function ChildNameChips({
  childrenList,
  selectedChild,
  selectedChildId,
  effectivePremium,
  selectChild,
  onLongPressSelected,
}: ChildNameChipsProps) {
  const { t } = useTranslation();

  const visibleChildren = useMemo(() => {
    if (!effectivePremium) {
      return selectedChild ? [selectedChild] : childrenList.slice(0, 1);
    }
    return childrenList;
  }, [effectivePremium, selectedChild, childrenList]);

  return (
    <View style={styles.childrenChipsWrap}>
      {visibleChildren.map((child) => {
        const selected = child.id === selectedChildId;
        return (
          <Pressable
            key={child.id}
            style={[
              styles.childNameChip,
              selected ? styles.childNameChipSelected : styles.childNameChipUnselected,
            ]}
            onLongPress={selected && onLongPressSelected ? onLongPressSelected : undefined}
            onPress={async () => {
              if (!effectivePremium) return;
              if (selected) return;
              await selectChild(child.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={selected ? t('home.childNameA11ySelected') : t('home.childNameA11y')}
          >
            <Text
              style={[
                styles.childNameText,
                selected ? styles.childNameTextSelected : styles.childNameTextUnselected,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {child.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  childrenChipsWrap: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  childNameChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginVertical: 2,
    maxWidth: '48%',
    minWidth: 72,
  },
  childNameChipSelected: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(7, 199, 247, 0.18)',
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  childNameChipUnselected: {
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: '#FFF',
  },
  childNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  childNameTextSelected: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a7ea4',
  },
  childNameTextUnselected: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});
