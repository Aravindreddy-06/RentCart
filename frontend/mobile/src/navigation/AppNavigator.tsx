/**
 * src/navigation/AppNavigator.tsx (mobile)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AppStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import CreateItemScreen from '../screens/CreateItemScreen';
import MyItemsScreen from '../screens/MyItemsScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../utils/colors';

export type MainTabParamList = {
  Explore: undefined;
  MyListings: undefined;
  BorrowRequests: undefined;
  UserProfile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
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
        name="Explore"
        component={HomeScreen as any}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="MyListings"
        component={MyItemsScreen as any}
        options={{
          tabBarLabel: 'My Items',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="BorrowRequests"
        component={RequestsScreen as any}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="UserProfile"
        component={ProfileScreen as any}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
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
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
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
