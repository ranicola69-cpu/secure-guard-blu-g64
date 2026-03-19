import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DonateButton() {
  const openDonation = () => {
    Alert.alert(
      '💖 Support Development',
      'Thank you for considering a donation!\n\nDeveloper: Richard Carmen Anicola\nEmail: richanicola@gmail.com',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Donate via PayPal',
          onPress: () => {
            Linking.openURL('https://www.paypal.com/paypalme/95weisland88@gmail.com');
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.donateButton} onPress={openDonation}>
      <Ionicons name="heart" size={20} color="#ff3366" />
      <Text style={styles.donateText}>DONATE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff336620',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ff3366',
  },
  donateText: {
    color: '#ff3366',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
