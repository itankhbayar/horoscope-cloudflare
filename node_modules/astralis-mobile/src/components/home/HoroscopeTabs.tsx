import React, { type ReactElement, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { hitSlopComfortable, spacing } from '../../theme';

export type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** When true, active tab uses lavender underline (horoscope). Otherwise white underline. */
  accentUnderline?: boolean;
};

function makeStyles(t: SanctuaryPalette) {
  return StyleSheet.create({
    outer: { marginBottom: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingHorizontal: 2,
      gap: 4,
    },
    tab: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 72,
      alignItems: 'center',
    },
    tabPressed: { opacity: 0.85 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    labelActive: { color: t.text },
    labelIdle: { color: t.textSoft },
    underline: {
      marginTop: 6,
      height: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      opacity: 0,
    },
    underlineAccent: {
      opacity: 1,
      backgroundColor: t.lavender,
    },
    underlineNeutral: {
      opacity: 1,
      backgroundColor: t.text,
    },
  });
}

export function HoroscopeTabs({
  tabs,
  activeId,
  onSelect,
  accentUnderline = true,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              hitSlop={hitSlopComfortable}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>{tab.label}</Text>
              <View
                style={[
                  styles.underline,
                  active && (accentUnderline ? styles.underlineAccent : styles.underlineNeutral),
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
