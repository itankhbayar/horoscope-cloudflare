import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  GuestWelcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Main: undefined;
  AccountSettings: undefined;
  AppAppearance: undefined;
  ManageNotifications: undefined;
  DeleteAccount: undefined;
  Premium: {
    source?:
      | 'locked_preview'
      | 'profile_card'
      | 'post_reading'
      | 'onboarding_teaser'
      | 'saved_reflection'
      | 'rhythm_insight'
      | 'relationship_atmosphere'
      | 'natal_resonance';
  } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Compatibility: undefined;
  Chart: undefined;
  Profile: undefined;
  Explore: undefined;
};

export type RootStackNav = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNav = BottomTabNavigationProp<MainTabParamList>;
