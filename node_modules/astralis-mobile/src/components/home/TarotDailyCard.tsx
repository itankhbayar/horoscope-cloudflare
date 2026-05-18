import React, { useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CTAButton } from './CTAButton';
import { ContentCard } from './ContentCard';
import { useAppearance } from '../../hooks/useAppearance';
import { spacing } from '../../theme';

type Props = {
  tarotName: string;
  tarotBody: string;
  onLearnMore?: () => void;
  onDrawAnother?: () => void;
};

function makeStyles(isLight: boolean) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: spacing.lg,
      overflow: 'hidden',
      borderRadius: 18,
      backgroundColor: isLight ? '#F7F2FF' : '#1E2661',
      borderColor: isLight ? 'rgba(108, 94, 170, 0.28)' : 'rgba(136, 150, 255, 0.22)',
      shadowColor: isLight ? 'rgba(76, 58, 140, 0.16)' : 'rgba(6, 8, 28, 0.52)',
    },
    header: {
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isLight ? 'rgba(114, 99, 176, 0.22)' : 'rgba(160, 176, 255, 0.3)',
    },
    headerTitle: {
      color: isLight ? '#2A2058' : '#FFFFFF',
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    bodyWrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md + 2,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isLight ? 'rgba(114, 99, 176, 0.2)' : 'rgba(160, 176, 255, 0.28)',
    },
    chooseWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md + 2,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isLight ? 'rgba(114, 99, 176, 0.2)' : 'rgba(160, 176, 255, 0.28)',
    },
    chooseText: {
      color: isLight ? '#2F275F' : '#FFFFFF',
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    deckRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    pickCard: {
      flex: 1,
      maxWidth: 112,
      minWidth: 88,
      aspectRatio: 0.68,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(118, 103, 184, 0.45)' : 'rgba(255,255,255,0.35)',
      backgroundColor: isLight ? '#E8E0FF' : '#101C62',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pickInnerRing: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(112, 83, 232, 0.65)' : 'rgba(255,255,255,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickEye: {
      color: isLight ? '#5F46CC' : '#F8F4D8',
      fontSize: 20,
      lineHeight: 22,
    },
    artFrame: {
      width: 112,
      height: 168,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(118, 103, 184, 0.35)' : 'rgba(255,255,255,0.2)',
      backgroundColor: isLight ? '#ECE4FF' : '#2A357A',
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    artGlow: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 999,
      backgroundColor: isLight ? 'rgba(130, 102, 225, 0.16)' : 'rgba(246, 224, 136, 0.18)',
      top: -46,
      right: -40,
    },
    artTexture: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isLight ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.05)',
    },
    artGlyph: {
      fontSize: 56,
      lineHeight: 60,
      color: isLight ? '#7053E8' : '#F0E091',
    },
    copyCol: {
      flex: 1,
      minWidth: 0,
      paddingTop: 2,
    },
    tarotName: {
      color: isLight ? '#2A2058' : '#FFFFFF',
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    tarotBody: {
      color: isLight ? '#3D336E' : '#FFFFFF',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    drawAnother: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      paddingVertical: 4,
    },
    drawAnotherText: {
      color: isLight ? '#7053E8' : '#F6E087',
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    drawAnotherIcon: {
      color: isLight ? '#7053E8' : '#F6E087',
      fontSize: 28,
      lineHeight: 28,
      marginTop: -2,
    },
    cta: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
    },
    ctaLabel: {
      color: '#172357',
    },
  });
}

export function TarotDailyCard({
  tarotName,
  tarotBody,
  onLearnMore,
  onDrawAnother,
}: Props): ReactElement {
  const { mode } = useAppearance();
  const isLight = mode === 'light';
  const styles = useMemo(() => makeStyles(isLight), [isLight]);
  const [revealed, setRevealed] = useState(false);

  return (
    <ContentCard style={styles.card} disableSurfaceEffects={!isLight}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Today's Tarot
        </Text>
      </View>

      {!revealed ? (
        <View style={styles.chooseWrap}>
          <Text style={styles.chooseText}>Clear your mind and choose a card that calls to you…</Text>
          <View style={styles.deckRow}>
            {[0, 1, 2].map((idx) => (
              <Pressable
                key={idx}
                onPress={() => setRevealed(true)}
                accessibilityRole="button"
                accessibilityLabel={`Choose tarot card ${idx + 1}`}
                style={styles.pickCard}
              >
                <View style={styles.pickInnerRing}>
                  <Text style={styles.pickEye}>◉</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.bodyWrap}>
            <View style={styles.artFrame} accessibilityRole="image" accessibilityLabel={`Tarot illustration for ${tarotName}`}>
              <View style={styles.artGlow} pointerEvents="none" />
              <View style={styles.artTexture} pointerEvents="none" />
              <Text style={styles.artGlyph}>✶</Text>
            </View>

            <View style={styles.copyCol}>
              <Text style={styles.tarotName}>{tarotName}</Text>
              <Text style={styles.tarotBody}>{tarotBody}</Text>
              <Pressable
                onPress={onDrawAnother}
                accessibilityRole="button"
                accessibilityLabel="Draw another tarot card"
                style={styles.drawAnother}
              >
                <Text style={styles.drawAnotherText}>Draw Another</Text>
                <Text style={styles.drawAnotherIcon}>{'\u21BB'}</Text>
              </Pressable>
            </View>
          </View>

          <CTAButton
            label="Learn more about Tarot with Reader"
            variant="white"
            onPress={onLearnMore}
            style={styles.cta}
          />
        </>
      )}
    </ContentCard>
  );
}
