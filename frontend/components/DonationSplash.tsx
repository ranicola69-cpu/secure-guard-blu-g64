import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DonationSplashProps {
  onDismiss: () => void;
}

const DONATE_URL = 'https://cash.app/$Ranicola1';
const SPLASH_COUNT_KEY = 'donation_splash_count';
const MAX_SPLASH_COUNT = 5;

export async function shouldShowDonationSplash(): Promise<boolean> {
  try {
    const countStr = await AsyncStorage.getItem(SPLASH_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count < MAX_SPLASH_COUNT) {
      await AsyncStorage.setItem(SPLASH_COUNT_KEY, (count + 1).toString());
      return count === 2;
    }
    return false;
  } catch {
    return false;
  }
}

export default function DonationSplash({ onDismiss }: DonationSplashProps) {
  const { width } = Dimensions.get('window');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDonate = async () => {
    await Linking.openURL(DONATE_URL).catch(() => {});
    onDismiss();
  };

  const handleSkip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }], width: Math.min(width - 40, 380) }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="heart" size={48} color="#ff3366" />
        </View>
        <Text style={styles.title}>Support Secure Guard</Text>
        <Text style={styles.subtitle}>Developed by Richard Carmen Anicola</Text>
        <Text style={styles.description}>
          This app is free and open source. Your support helps fund continued development, new features, and keeping the threat database updated.
        </Text>
        <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
          <Ionicons name="card" size={20} color="#fff" />
          <Text style={styles.donateButtonText}>DONATE VIA CASH APP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  container: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff336640',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#ff336615',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff336640',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff3366',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
});
