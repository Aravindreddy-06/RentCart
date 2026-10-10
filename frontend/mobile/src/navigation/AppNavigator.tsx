/**
 * src/navigation/AppNavigator.tsx (mobile)
 * Bottom tabs: Home, Requests (with pending badge), My Rentals, Profile
 * Keep "+" Add Item button on Home.
 * Stack screens: ItemDetail, RentalDetail, RequestBorrow, AddItem, CreateItem, MyItems, Profile.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
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
import { rentalsService } from '../services/rentals.service';
import { colors } from '../utils/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Floating "+" button rendered over the tab bar
function AddItemFab({ navigation }: { navigation: NativeStackNavigationProp<AppStackParamList> }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('AddItem')}
      activeOpacity={0.85}
    >
      <Text style={styles.fabText}>＋</Text>
    </TouchableOpacity>
  );
}

function MainTabs({ navigation }: { navigation: NativeStackNavigationProp<AppStackParamList> }) {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const data = await rentalsService.getIncoming('PENDING', 1, 1);
      setPendingCount(data.pagination.total || 0);
    } catch {
      // Ignore if not logged in or network error
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 15000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.gray[400],
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
            paddingBottom: 4,
            paddingTop: 4,
            height: 60,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen as any}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tab.Screen
          name="RequestsTab"
          component={RequestsScreen as any}
          options={{
            tabBarLabel: 'Requests',
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📥</Text>,
          }}
          listeners={{
            focus: () => {
              refreshPendingCount();
            },
          }}
        />
        <Tab.Screen
          name="MyRentalsTab"
          component={MyRentalsScreen as any}
          options={{
            tabBarLabel: 'My Rentals',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤝</Text>,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen as any}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
          }}
        />
      </Tab.Navigator>
      {/* Floating "+" button over the tab bar */}
      <AddItemFab navigation={navigation} />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.gray[900],
        headerTitleStyle: { fontWeight: '700' },
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
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 72, // above tab bar (60) + 12 gap
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
