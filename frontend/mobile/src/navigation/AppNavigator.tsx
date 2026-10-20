/**
 * src/navigation/AppNavigator.tsx (mobile)
 * Polished bottom tabs and stack navigator:
 * - Teal active tab with Ionicons and pill indicator
 * - Red unread badge on Requests and Messages
 * - Warm gradient floating "+" Add Item button
 * - Full dark theme support for headers and bottom tabs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStackParamList, MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddItemScreen from '../screens/AddItemScreen';
import CreateItemScreen from '../screens/CreateItemScreen';
import MyItemsScreen from '../screens/MyItemsScreen';
import RequestsScreen from '../screens/RequestsScreen';
import MyRentalsScreen from '../screens/MyRentalsScreen';
import RentalDetailScreen from '../screens/RentalDetailScreen';
import RequestBorrowScreen from '../screens/RequestBorrowScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import { rentalsService } from '../services/rentals.service';
import { chatsService } from '../services/chats.service';
import { colors, gradients, shadows } from '../utils/colors';
import { useTheme } from '../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsGlyph = React.ComponentProps<typeof Ionicons>['name'];
const FALLBACK_ICON: IoniconsGlyph = 'help-circle-outline';

/**
 * Validates that an icon glyph name exists in Ionicons.glyphMap,
 * safely falling back to a default icon if not present.
 */
function getValidIoniconsGlyph(name: string, fallback: IoniconsGlyph = FALLBACK_ICON): IoniconsGlyph {
  if (Ionicons.glyphMap && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name)) {
    return name as IoniconsGlyph;
  }
  return fallback;
}

interface TabBarIconWrapperProps {
  focused: boolean;
  activeName: string;
  inactiveName: string;
  color: string;
  isDark: boolean;
}

/**
 * Custom 56x32 pill indicator wrapper for bottom tab bar icons.
 * Ensures centered layout, overflow visible, and no lineHeight clipping on Android.
 */
function TabBarIconWrapper({
  focused,
  activeName,
  inactiveName,
  color,
  isDark,
}: TabBarIconWrapperProps) {
  const desiredName = focused ? activeName : inactiveName;
  const glyphName = getValidIoniconsGlyph(desiredName);

  return (
    <View
      style={[
        styles.tabIconWrapper,
        focused && {
          backgroundColor: isDark ? 'rgba(15, 157, 138, 0.2)' : colors.primary[50],
        },
      ]}
    >
      <Ionicons
        name={glyphName}
        size={22}
        color={color}
        style={styles.tabIcon}
      />
    </View>
  );
}

// Floating "+" button with warm gradient, positioned above the dynamic tab bar
function AddItemFab({
  navigation,
  bottomInset,
}: {
  navigation: NativeStackNavigationProp<AppStackParamList>;
  bottomInset: number;
}) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('AddItem')}
      activeOpacity={0.88}
      style={[styles.fabContainer, { bottom: 76 + bottomInset }]}
    >
      <LinearGradient
        colors={gradients.warm as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" style={styles.fabIcon} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function MainTabs({ navigation }: { navigation: NativeStackNavigationProp<AppStackParamList> }) {
  const { isDark, themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    try {
      const [pendingRes, unreadRes] = await Promise.allSettled([
        rentalsService.getIncoming('PENDING', 1, 1),
        chatsService.getUnreadCount(),
      ]);
      if (pendingRes.status === 'fulfilled') {
        setPendingCount(pendingRes.value.pagination.total || 0);
      }
      if (unreadRes.status === 'fulfilled') {
        setUnreadChatCount(unreadRes.value);
      }
    } catch {
      // Ignore network errors or unauthenticated state
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 15000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: isDark ? colors.dark.textMuted : colors.textMuted,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
            lineHeight: 14,
          },
          tabBarStyle: {
            backgroundColor: themeColors.surface,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
            paddingTop: 8,
            paddingBottom: insets.bottom,
            height: 64 + insets.bottom,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen as any}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWrapper
                focused={focused}
                activeName="home"
                inactiveName="home-outline"
                color={color}
                isDark={isDark}
              />
            ),
          }}
        />
        <Tab.Screen
          name="RequestsTab"
          component={RequestsScreen as any}
          options={{
            tabBarLabel: 'Requests',
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWrapper
                focused={focused}
                activeName="clipboard"
                inactiveName="clipboard-outline"
                color={color}
                isDark={isDark}
              />
            ),
          }}
          listeners={{
            focus: () => {
              refreshCounts();
            },
          }}
        />
        <Tab.Screen
          name="MessagesTab"
          component={MessagesScreen as any}
          options={{
            tabBarLabel: 'Messages',
            tabBarBadge: unreadChatCount > 0 ? unreadChatCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWrapper
                focused={focused}
                activeName="chatbubbles"
                inactiveName="chatbubbles-outline"
                color={color}
                isDark={isDark}
              />
            ),
          }}
          listeners={{
            focus: () => {
              refreshCounts();
            },
          }}
        />
        <Tab.Screen
          name="MyRentalsTab"
          component={MyRentalsScreen as any}
          options={{
            tabBarLabel: 'My Rentals',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWrapper
                focused={focused}
                activeName="receipt"
                inactiveName="receipt-outline"
                color={color}
                isDark={isDark}
              />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen as any}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWrapper
                focused={focused}
                activeName="person"
                inactiveName="person-outline"
                color={color}
                isDark={isDark}
              />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Floating Warm Gradient "+" FAB */}
      <AddItemFab navigation={navigation} bottomInset={insets.bottom} />
    </View>
  );
}

export default function AppNavigator() {
  const { isDark, themeColors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.surface,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}
    >
      <Stack.Screen
        name="Home"
        options={{ headerShown: false }}
      >
        {({ navigation }) => <MainTabs navigation={navigation as unknown as NativeStackNavigationProp<AppStackParamList>} />}
      </Stack.Screen>
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <Stack.Screen
        name="RentalDetail"
        component={RentalDetailScreen}
        options={{ title: 'Rental Details' }}
      />
      <Stack.Screen
        name="RequestBorrow"
        component={RequestBorrowScreen}
        options={{ title: 'Request to Borrow' }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: 'List an Item' }}
      />
      <Stack.Screen
        name="CreateItem"
        component={CreateItemScreen}
        options={{ title: 'List an Item' }}
      />
      <Stack.Screen
        name="MyItems"
        component={MyItemsScreen}
        options={{ title: 'My Listings' }}
      />
      <Stack.Screen
        name="Requests"
        component={RequestsScreen}
        options={{ title: 'Requests' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{ title: 'Community Member' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.otherUserName || 'Chat',
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tabIcon: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    ...shadows.accent,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
});
