import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DonateButton() {
  const openDonation = () => {
    Alert.alert(
      'Support Development',
      'Thank you for considering a donation!\n\nDeveloper: Richard Carmen Anicola\nEmail: richanicola@gmail.com',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Donate via Cash App',
          onPress: () => Linking.openURL('https://cash.app/$Ranicola1').catch(() => {}),
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.donateButton} onPress={openDonation}>
      <Ionicons name="heart" size={16} color="#ff3366" />
      <Text style={styles.donateText}>DONATE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff336615',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#ff336640',
  },
  donateText: {
    color: '#ff3366',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
