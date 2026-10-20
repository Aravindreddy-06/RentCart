/**
 * src/screens/SplashScreen.tsx (mobile)
 * Full-screen brand gradient splash screen:
 * - Brand gradient ['#0F9D8A', '#12C2A8']
 * - White logo with gentle pulse/scale animation
 * - Tagline fading in
 * - Subtle loading indicator
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients } from '../utils/colors';

export default function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle pulse animation for logo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Fade-in tagline
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim, fadeAnim]);

  return (
    <LinearGradient
      colors={gradients.brand as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Animated White Logo Badge */}
        <Animated.View style={[styles.logoBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="cart" size={46} color="#0F9D8A" />
        </Animated.View>

        <Text style={styles.title}>RentCart</Text>

        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          Borrow What You Need · Lend What You Don't
        </Animated.Text>

        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  spinnerContainer: {
    marginTop: 44,
  },
});
