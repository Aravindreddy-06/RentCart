/**
 * src/screens/SplashScreen.tsx (mobile)
 * Initial splash screen displayed on app startup.
 * Shows RentCart branding with a smooth min 1.5s loading animation while verifying auth token.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView } from 'react-native';
import { colors } from '../utils/colors';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🤝</Text>
        </View>
        <Text style={styles.title}>RentCart</Text>
        <Text style={styles.subtitle}>Neighbourhood Sharing Platform</Text>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 44,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.gray[900],
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 40,
  },
  spinnerContainer: {
    marginTop: 20,
  },
});
