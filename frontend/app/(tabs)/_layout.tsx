import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import DonationSplash, { shouldShowDonationSplash } from '../../components/DonationSplash';

export default function TabLayout() {
  const [showDonation, setShowDonation] = useState(false);

  useEffect(() => {
    checkDonationSplash();
  }, []);

  const checkDonationSplash = async () => {
    const shouldShow = await shouldShowDonationSplash();
    setShowDonation(shouldShow);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#00ff88',
          tabBarInactiveTintColor: '#555',
          tabBarStyle: {
            backgroundColor: '#0a0a0a',
            borderTopColor: '#1a1a1a',
            height: 58,
            paddingBottom: 6,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="security"
          options={{
            title: 'Security',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vpn"
          options={{
            title: 'VPN',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="planet" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="device"
          options={{
            title: 'Device',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="phone-portrait" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="storage"
          options={{
            title: 'Storage',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="apps"
          options={{
            title: 'Apps',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="apps" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="root"
          options={{
            title: 'Root',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'ROMs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dns"
          options={{
            title: 'DNS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="server" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cleaner"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {showDonation && (
        <DonationSplash onDismiss={() => setShowDonation(false)} />
      )}
    </View>
  );
}
