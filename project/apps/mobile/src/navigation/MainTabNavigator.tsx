import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';

import CollectionsScreen from '../screens/CollectionsScreen';
import ManagementScreen from '../screens/ManagementScreen';
import ShareManagementScreen from '../screens/ShareManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

type RootStackParamList = {
  Main: undefined;
  Collections: undefined;
  Management: undefined;
  Shares: undefined;
  Profile: undefined;
  ShareDetail: { shareId: string; isOwner?: boolean; password?: string };
  AddCollection: { mode?: string };
  CollectionDetail: { id: string };
  EditCollection: { id: string; mode?: string };
  ShareManagement: undefined;
  CreateShare: undefined;
  AccountSettings: undefined;
  TagManage: undefined;
  PlatformStats: undefined;
  Tier: undefined;
  TierUpgrade: undefined;
  QuickAdd: { mode?: string; url?: string; title?: string };
};

export default function MainTabNavigator() {
  const { theme, colors } = useThemeStore();
  const { t } = useI18n();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Collections') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Management') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Shares') {
            iconName = focused ? 'share-social' : 'share-social-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Collections" 
        component={CollectionsScreen} 
        options={{ title: t('nav.collections'), headerLeft: () => null }}
      />
      <Tab.Screen 
        name="Management" 
        component={ManagementScreen} 
        options={{ title: t('management.title') }}
      />
      <Tab.Screen 
        name="Shares" 
        component={ShareManagementScreen} 
        options={{ title: t('share.shareLinks') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: t('nav.profile') }}
      />
    </Tab.Navigator>
  );
}
