import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Main: undefined;
  AccountSettings: undefined;
  AppAppearance: undefined;
  ManageNotifications: undefined;
  DeleteAccount: undefined;
  Premium: { source?: 'locked_preview' | 'profile_card' | 'post_reading' | 'onboarding_teaser' } | undefined;
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
