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

const { width, height } = Dimensions.get('window');

interface DonationSplashProps {
  onDismiss: () => void;
}

const DONATE_URL = 'https://cash.app/$Ranicola1';
const SPLASH_COUNT_KEY = 'donation_splash_count';
const MAX_SPLASH_COUNT = 5;

export default function DonationSplash({ onDismiss }: DonationSplashProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDonate = async () => {
    await Linking.openURL(DONATE_URL);
    onDismiss();
  };

  const handleSkip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="heart" size={64} color="#ff3366" />
        </View>

        <Text style={styles.title}>Support Secure Guard</Text>
        
        <Text style={styles.subtitle}>
          Help us keep your device secure!
        </Text>

        <Text style={styles.description}>
          Secure Guard is developed by{'\n'}
          <Text style={styles.highlight}>DPHMS - Doctor Power House Mobile Solutions</Text>
          {'\n\n'}
          Your donation helps us:
        </Text>

        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
            <Text style={styles.benefitText}>Maintain threat database updates</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
            <Text style={styles.benefitText}>Add new security features</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
            <Text style={styles.benefitText}>Keep VPN servers running</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
            <Text style={styles.benefitText}>Support development costs</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
          <Ionicons name="heart" size={24} color="#fff" />
          <Text style={styles.donateButtonText}>DONATE NOW</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Maybe Later</Text>
        </TouchableOpacity>

        <View style={styles.developerInfo}>
          <Text style={styles.developerText}>
            Developed by Richard Carmen Anicola
          </Text>
          <Text style={styles.companyText}>
            DPHMS - Doctor Power House Mobile Solutions
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Helper function to check if splash should be shown
export async function shouldShowDonationSplash(): Promise<boolean> {
  try {
    const countStr = await AsyncStorage.getItem(SPLASH_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    
    if (count >= MAX_SPLASH_COUNT) {
      return false;
    }
    
    // Increment count
    await AsyncStorage.setItem(SPLASH_COUNT_KEY, (count + 1).toString());
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: width - 48,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff3366',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ff336620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#00ff88',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  highlight: {
    color: '#00ff88',
    fontWeight: '600',
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 13,
    color: '#ccc',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3366',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  developerInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  developerText: {
    fontSize: 11,
    color: '#666',
  },
  companyText: {
    fontSize: 10,
    color: '#00ff8880',
    marginTop: 4,
  },
});
