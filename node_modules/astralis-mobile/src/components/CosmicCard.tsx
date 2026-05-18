import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ViewProps } from 'react-native';
import { cosmicGlow, cardTitleSize } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

type Props = ViewProps & {
  title?: string;
  children: React.ReactNode;
};

function CosmicCardInner({ title, children, style, ...rest }: Props): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { mode, palette } = useAppearance();
  const titleSize = useMemo(() => cardTitleSize(width), [width]);

  return (
    <View
      style={[
        styles.card,
        cosmicGlow,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowOpacity: mode === 'light' ? 0.08 : 0.22,
        },
        style,
      ]}
      {...rest}
    >
      {title ? (
        <Text
          style={[styles.title, { fontSize: titleSize, color: mode === 'light' ? '#3c4a8b' : '#d4af37' }]}
          accessibilityRole="header"
          accessibilityLabel={title}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export const CosmicCard = React.memo(CosmicCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
    maxWidth: '100%',
  },
  title: {
    fontWeight: '700',
    marginBottom: 10,
  },
});
