import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, useColorScheme, StyleSheet, Linking, AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { ChatWebView } from './src/components/ChatWebView';
import { BiometricLock } from './src/components/BiometricLock';
import { useSettingsStore, useAuthStore } from './src/store';
import { colors } from './src/theme';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Parse conversation ID from deep link URL
function parseConversationId(url: string | null): string | null {
  if (!url) return null;

  try {
    // Handle actionableplus://c/123 or actionableplus://c/123
    if (url.startsWith('actionableplus://')) {
      const path = url.replace('actionableplus://', '');
      const match = path.match(/^c\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    }

    // Handle https://app.actionableplus.com/c/123
    if (url.includes('app.actionableplus.com')) {
      const urlObj = new URL(url);
      const match = urlObj.pathname.match(/^\/c\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    }
  } catch (e) {
    console.warn('Failed to parse deep link:', e);
  }

  return null;
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const systemColorScheme = useColorScheme();
  const settingsColorScheme = useSettingsStore((state) => state.colorScheme);
  const biometricsEnabled = useSettingsStore((state) => state.biometricsEnabled);
  const token = useAuthStore((state) => state.token);

  const colorScheme =
    settingsColorScheme === 'system'
      ? systemColorScheme ?? 'light'
      : settingsColorScheme;

  const themeColors = colors[colorScheme];

  // Check if biometric lock is needed
  const needsBiometricLock = biometricsEnabled && token && !isUnlocked;

  // Re-lock when app comes back from background (optional - for extra security)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && biometricsEnabled && token) {
        // Optionally re-lock when coming back from background
        // setIsUnlocked(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [biometricsEnabled, token]);

  // Handle deep links
  useEffect(() => {
    // Get initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      const convId = parseConversationId(url);
      if (convId) {
        setConversationId(convId);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const convId = parseConversationId(url);
      if (convId) {
        setConversationId(convId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize app (fonts, auth state, etc.)
        // Auth state rehydrates automatically via Zustand persist
      } catch (e) {
        console.warn('Error loading app:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  // Show biometric lock screen if needed
  if (needsBiometricLock) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={themeColors.surfacePrimary}
        />
        <SafeAreaView
          style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}
          onLayout={onLayoutRootView}
        >
          <BiometricLock
            colorScheme={colorScheme}
            onSuccess={() => setIsUnlocked(true)}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.surfacePrimary}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}
        onLayout={onLayoutRootView}
        edges={['top']} // Only add safe area to top (notch), WebView handles bottom
      >
        <ChatWebView colorScheme={colorScheme} conversationId={conversationId} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
