import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type ResearchNoteProps = {
  evidenceNote: string;
};

export function ResearchNote({ evidenceNote }: ResearchNoteProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('researchNote.title')}</Text>
      <Text style={styles.subtitle}>{t('researchNote.subtitle')}</Text>
      <Text style={styles.body}>{evidenceNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#252525',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
});
