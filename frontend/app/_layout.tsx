import { Stack, ErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useRouter, useSegments } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  
  const [loaded, error] = useFonts({
    'AshleyNicole': require('../assets/fonts/AshleyNicole.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      // Navigate directly to tabs, skip splash
      if (segments[0] !== '(tabs)') {
        router.replace('/(tabs)/security');
      }
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}
