import React, { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PatternMemory } from '@astralis/lib/types';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

const GLYPH = '⚚'; // ⚚ — a quiet "memory" mark

type Props = {
  memory: PatternMemory;
  /** Fired the first time the user expands the card. */
  onOpen?: () => void;
};

/**
 * Premium "Pattern Memory" section. Content (title/body) is already localized and
 * safety-checked server-side; this component only presents it. Free users never receive
 * a `patternMemory` payload, so this is simply not rendered for them.
 */
export function PatternMemoryCard({ memory, onOpen }: Props): ReactElement {
  const theme = useSanctuaryTheme();
  const [open, setOpen] = useState(false);

  const toggle = (): void => {
    setOpen((current) => {
      if (!current) onOpen?.();
      return !current;
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.pressed,
      ]}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={memory.title}
    >
      <View style={[styles.wash, { backgroundColor: theme.lavender }]} pointerEvents="none" />
      <View style={styles.headerRow}>
        <Text style={[styles.glyph, { color: theme.lavender }]} allowFontScaling={false}>
          {GLYPH}
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>{memory.title}</Text>
        <Text style={[styles.chevron, { color: theme.textMuted }]} allowFontScaling={false}>
          {open ? '−' : '+'}
        </Text>
      </View>
      <Text
        style={[styles.body, { color: theme.textMuted }]}
        numberOfLines={open ? undefined : 2}
      >
        {memory.body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 80,
    right: -70,
    top: -76,
    opacity: 0.1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  glyph: {
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chevron: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
