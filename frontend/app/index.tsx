import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.5);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/(tabs)/security');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={100} color="#00ff88" />
        </View>
        <Text style={styles.title}>SECURE GUARD</Text>
        <Text style={styles.subtitle}>Military Grade Security</Text>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>POWERED BY SHIZUKU</Text>
        </View>
        
        <View style={styles.developerSection}>
          <Text style={styles.developerLabel}>Developed by</Text>
          <Text style={styles.developerName}>Richard Carmen Anicola</Text>
          <View style={styles.companyBadge}>
            <Ionicons name="business" size={14} color="#00ff88" />
            <Text style={styles.companyName}>DPHMS</Text>
          </View>
          <Text style={styles.companyFull}>Doctor Power House Mobile Solutions</Text>
        </View>
      </Animated.View>
      
      <View style={styles.footer}>
        <Text style={styles.versionText}>v1.4.1</Text>
      </View>
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
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: '#00ff8820',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00ff88',
    marginBottom: 40,
  },
  badgeText: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  developerSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  developerLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  developerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8815',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff88',
    letterSpacing: 1,
  },
  companyFull: {
    fontSize: 10,
    color: '#00ff8880',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: '#333',
  },
});
