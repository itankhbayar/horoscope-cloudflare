import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScreenScroll } from '../components/ScreenScroll';
import { screenTitleSize, spacing } from '../theme';

type ExploreCategory = {
  title: string;
  imageUrl: string;
  tint: string;
};

const EXPLORE_CATEGORIES: ExploreCategory[] = [
  { title: 'Readers', imageUrl: 'https://images.unsplash.com/photo-1508025690966-2a9a1957da99?auto=format&fit=crop&w=800&q=80', tint: 'rgba(80, 62, 183, 0.48)' },
  { title: 'Psychic', imageUrl: 'https://images.unsplash.com/photo-1532960400857-e8d9d275d858?auto=format&fit=crop&w=800&q=80', tint: 'rgba(139, 114, 255, 0.45)' },
  { title: 'Love', imageUrl: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?auto=format&fit=crop&w=800&q=80', tint: 'rgba(220, 108, 164, 0.4)' },
  { title: 'Tarot', imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c6795f?auto=format&fit=crop&w=800&q=80', tint: 'rgba(126, 181, 206, 0.45)' },
  { title: 'Astrology', imageUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=800&q=80', tint: 'rgba(56, 104, 205, 0.45)' },
  { title: 'Mediumship', imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80', tint: 'rgba(173, 67, 196, 0.5)' },
  { title: 'Human\nDesign', imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80', tint: 'rgba(122, 117, 222, 0.48)' },
  { title: 'Energy\nHealing', imageUrl: 'https://images.unsplash.com/photo-1516528387618-afa90b13e000?auto=format&fit=crop&w=800&q=80', tint: 'rgba(89, 141, 228, 0.45)' },
  { title: 'Numerology', imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=800&q=80', tint: 'rgba(109, 186, 146, 0.43)' },
  { title: 'Crystals', imageUrl: 'https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?auto=format&fit=crop&w=800&q=80', tint: 'rgba(176, 116, 214, 0.44)' },
];

export function ExploreScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const titleSize = useMemo(() => screenTitleSize(width), [width]);

  return (
    <ScreenScroll style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { fontSize: titleSize }]} accessibilityRole="header">
        Explore
      </Text>
      <View style={styles.grid}>
        {EXPLORE_CATEGORIES.map((category) => (
          <ExploreCard key={category.title} category={category} />
        ))}
      </View>
    </ScreenScroll>
  );
}

function ExploreCard({ category }: { category: ExploreCategory }): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${category.title.replace('\n', ' ')}`}
    >
      <Text style={styles.cardTitle}>{category.title}</Text>
      <View style={styles.imageDock}>
        <Image source={{ uri: category.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={[styles.tintOverlay, { backgroundColor: category.tint }]} />
        <View style={styles.noiseOverlay} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: '#15162B',
  },
  container: {
    paddingTop: 42,
    paddingBottom: 128,
    gap: spacing.md,
  },
  title: {
    color: '#F6F7FF',
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '48.25%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2B2D42',
    borderWidth: 1,
    borderColor: 'rgba(120, 124, 164, 0.2)',
    position: 'relative',
    padding: 12,
  },
  cardTitle: {
    color: '#F4F5FF',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '500',
    maxWidth: '58%',
    zIndex: 2,
  },
  imageDock: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '44%',
    borderTopLeftRadius: 34,
    borderBottomLeftRadius: 34,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pressed: { opacity: 0.9 },
});
