import { Platform, ViewStyle } from 'react-native';

export const cosmicGlow: ViewStyle = {
  ...Platform.select({
    ios: {
      shadowColor: '#8b6bff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    default: {},
  }),
};
