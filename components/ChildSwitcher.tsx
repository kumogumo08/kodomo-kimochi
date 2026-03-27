import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useChild } from '@/contexts/ChildContext';

type ChildSwitcherProps = {
  onRequestUpgrade?: () => void;
  onRequestRemoveChild?: (childId: string) => void;
};

export function ChildSwitcher({ onRequestUpgrade, onRequestRemoveChild }: ChildSwitcherProps) {
  const { children, selectedChildId, selectedChild, canAddChild, maxChildren, selectChild, addNewChild, updateChildName } =
    useChild();
  const { t } = useTranslation();
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const openRename = (childId: string, currentName: string) => {
    setEditingChildId(childId);
    setNameDraft(currentName);
  };

  const closeRename = () => {
    setEditingChildId(null);
    setNameDraft('');
  };

  useEffect(() => {
    if (!editingChildId) return;
    const stillExists = children.some((c) => c.id === editingChildId);
    if (!stillExists) {
      setEditingChildId(null);
      setNameDraft('');
    }
  }, [children, editingChildId]);

  const onPressAdd = async () => {
    const added = await addNewChild();
    if (!added) {
      onRequestUpgrade?.();
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {t('childSwitcher.label', { name: selectedChild?.name ?? t('childSwitcher.defaultName') })}
      </Text>
      <View style={styles.row}>
        {children.map((child) => {
          const selected = child.id === selectedChildId;
          return (
            <Pressable
              key={child.id}
              onPress={() => selectChild(child.id)}
              onLongPress={() => openRename(child.id, child.name)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={
                selected ? t('childSwitcher.chipA11ySelected') : t('childSwitcher.chipA11y')
              }
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {child.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onPressAdd}
          style={[styles.addChip, !canAddChild && styles.addChipDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.addChipText}>{t('childSwitcher.addChip')}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {t('childSwitcher.hint', { max: maxChildren })}
      </Text>

      <Modal transparent visible={!!editingChildId} animationType="fade" onRequestClose={closeRename}>
        <Pressable style={styles.backdrop} onPress={closeRename}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('childSwitcher.renameModalTitle')}</Text>
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={20}
              placeholder={t('childSwitcher.placeholderName')}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              {onRequestRemoveChild && children.length > 1 && editingChildId ? (
                <Pressable
                  onPress={() => {
                    if (!editingChildId) return;
                    onRequestRemoveChild(editingChildId);
                  }}
                  style={({ pressed }) => [styles.deleteModalButton, pressed && styles.deleteModalButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('childSwitcher.deleteChildA11y')}
                >
                  <Text style={styles.deleteModalText}>{t('childSwitcher.delete')}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={styles.modalRightActions}>
                <Pressable onPress={closeRename}>
                  <Text style={styles.cancelText}>{t('childSwitcher.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!editingChildId) return;
                    await updateChildName(editingChildId, nameDraft);
                    closeRename();
                  }}
                >
                  <Text style={styles.saveText}>{t('childSwitcher.save')}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFF',
  },
  addChip: {
    borderRadius: 999,
    backgroundColor: '#E8F5FF',
    borderWidth: 1,
    borderColor: '#B8E3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addChipDisabled: {
    opacity: 0.75,
  },
  addChipText: {
    fontSize: 13,
    color: '#0B5F85',
    fontWeight: '700',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  backdrop: {
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
  input: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteModalButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    backgroundColor: 'rgba(220,38,38,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deleteModalButtonPressed: {
    opacity: 0.9,
  },
  deleteModalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  cancelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveText: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '700',
  },
});
