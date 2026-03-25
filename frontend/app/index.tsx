import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const timer = setTimeout(() => {
      pulse.stop();
      router.replace('/(tabs)/security');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={72} color="#00ff88" />
          </View>
        </Animated.View>

        <Text style={styles.title}>SECURE GUARD</Text>
        <Text style={styles.subtitle}>Military Grade Security</Text>

        <View style={styles.badge}>
          <Ionicons name="hardware-chip" size={12} color="#00ff88" />
          <Text style={styles.badgeText}>POWERED BY SHIZUKU</Text>
        </View>

        <View style={styles.developerSection}>
          <Text style={styles.developerLabel}>Developed by</Text>
          <Text style={styles.developerName}>Richard Carmen Anicola</Text>
          <View style={styles.companyBadge}>
            <Ionicons name="business" size={13} color="#00ff88" />
            <Text style={styles.companyName}>DPHMS</Text>
          </View>
          <Text style={styles.companyFull}>Doctor Power House Mobile Solutions</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.versionText}>v1.5.0 STABLE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#00ff8808',
    borderWidth: 1,
    borderColor: '#00ff8830',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#00ff8812',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#00ff88',
    marginBottom: 6,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    letterSpacing: 2,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00ff8810',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00ff8830',
    marginBottom: 40,
  },
  badgeText: {
    color: '#00ff88',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  developerSection: {
    alignItems: 'center',
  },
  developerLabel: {
    fontSize: 11,
    color: '#555',
    marginBottom: 3,
    fontFamily: 'Inter_400Regular',
  },
  developerName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#ddd',
    marginBottom: 12,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8810',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#00ff88',
    letterSpacing: 1,
  },
  companyFull: {
    fontSize: 10,
    color: '#00ff8860',
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  versionText: {
    fontSize: 11,
    color: '#2a2a2a',
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
  },
});
