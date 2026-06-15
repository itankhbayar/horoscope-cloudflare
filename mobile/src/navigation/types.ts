import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ZodiacSign } from '@astralis/lib/types';

export type RootStackParamList = {
  GuestWelcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  AccountSettings: undefined;
  AppAppearance: undefined;
  AllSigns: undefined;
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
  Home: { sign?: ZodiacSign } | undefined;
  Compatibility:
    | {
        sign1?: ZodiacSign;
        sign2?: ZodiacSign;
        recipientSign?: ZodiacSign | null;
        fromShare?: boolean;
      }
    | undefined;
  Chart: undefined;
  Profile: undefined;
  Explore: undefined;
};

export type RootStackNav = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNav = BottomTabNavigationProp<MainTabParamList>;
