import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ViewProps } from 'react-native';
import { colors, cosmicGlow, cardTitleSize } from '../theme';

type Props = ViewProps & {
  title?: string;
  children: React.ReactNode;
};

function CosmicCardInner({ title, children, style, ...rest }: Props): React.JSX.Element {
  const { width } = useWindowDimensions();
  const titleSize = useMemo(() => cardTitleSize(width), [width]);

  return (
    <View style={[styles.card, cosmicGlow, style]} {...rest}>
      {title ? (
        <Text
          style={[styles.title, { fontSize: titleSize }]}
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginVertical: 8,
    maxWidth: '100%',
  },
  title: {
    fontWeight: '700',
    color: colors.gold,
    marginBottom: 10,
  },
});
