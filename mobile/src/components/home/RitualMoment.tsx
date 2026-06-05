import React, { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { spacing } from '../../theme';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { useI18n, type TranslationKey } from '../../i18n';

export type RitualMomentProps = {
  moment: 'reading' | 'resonance' | 'reflection' | 'continuation' | 'premium' | 'close';
  title: string;
  primaryLine: string;
  detail?: string;
  symbol?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  entranceOpacity?: Animated.Value;
  onLayout?: (e: LayoutChangeEvent) => void;
  defaultExpanded?: boolean;
};

function makeStyles(t: SanctuaryPalette) {
  return StyleSheet.create({
    shell: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: t.cardBorder,
      backgroundColor: t.card,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    symbol: {
      width: 58,
      minHeight: 58,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(216, 221, 255, 0.16)',
    },
    copy: { flex: 1, minWidth: 0 },
    eyebrow: {
      color: t.textSoft,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0,
    },
    title: {
      color: t.text,
      marginTop: 3,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: '900',
    },
    line: {
      color: t.textMuted,
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '700',
    },
    detail: {
      color: t.textMuted,
      marginTop: spacing.md,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
    },
    action: {
      minHeight: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: t.surfaceTint,
    },
    actionText: {
      color: t.lavender,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '900',
      textAlign: 'center',
    },
    pressed: { opacity: 0.82 },
  });
}

const MOMENT_LABEL_KEYS: Record<RitualMomentProps['moment'], TranslationKey> = {
  reading: 'ritual.momentReading',
  resonance: 'ritual.momentResonance',
  reflection: 'ritual.momentReflection',
  continuation: 'ritual.momentContinuation',
  premium: 'ritual.momentPremium',
  close: 'ritual.momentClose',
};

export function RitualMoment({
  moment,
  title,
  primaryLine,
  detail,
  symbol,
  actionLabel,
  onAction,
  entranceOpacity,
  onLayout,
  defaultExpanded = false,
}: RitualMomentProps): ReactElement {
  const t = useSanctuaryTheme();
  const { t: translate } = useI18n();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const showDetail = Boolean(detail && expanded);
  const action = onAction ?? (detail ? () => setExpanded((current) => !current) : undefined);
  const resolvedLabel =
    actionLabel ?? (expanded ? translate('ritual.letSettle') : translate('ritual.readDeeper'));

  return (
    <Animated.View onLayout={onLayout} style={[styles.shell, entranceOpacity ? { opacity: entranceOpacity } : null]}>
      <View style={styles.row}>
        {symbol ? <View style={styles.symbol}>{symbol}</View> : null}
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{translate(MOMENT_LABEL_KEYS[moment])}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <Text style={styles.line}>{primaryLine}</Text>
      {showDetail ? <Text style={styles.detail}>{detail}</Text> : null}
      {action ? (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          onPress={action}
          accessibilityRole="button"
          accessibilityLabel={resolvedLabel}
        >
          <Text style={styles.actionText}>{resolvedLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
