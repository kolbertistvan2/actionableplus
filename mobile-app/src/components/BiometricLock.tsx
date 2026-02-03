import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../theme';

interface BiometricLockProps {
  onSuccess: () => void;
  colorScheme: 'light' | 'dark';
}

export const BiometricLock: React.FC<BiometricLockProps> = ({
  onSuccess,
  colorScheme,
}) => {
  const [error, setError] = useState<string | null>(null);
  const themeColors = colors[colorScheme];

  const authenticate = async () => {
    setError(null);

    try {
      // Check if biometrics are available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // No biometric hardware - skip auth
        onSuccess();
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        // No biometrics enrolled - skip auth
        onSuccess();
        return;
      }

      // Prompt for biometric auth
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Actionable+',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onSuccess();
      } else if (result.error === 'user_cancel') {
        setError('Authentication cancelled');
      } else {
        setError('Authentication failed');
      }
    } catch (e) {
      console.error('Biometric auth error:', e);
      setError('Authentication error');
    }
  };

  // Auto-authenticate on mount
  useEffect(() => {
    authenticate();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}>
      <View style={styles.content}>
        <Text style={[styles.icon]}>🔒</Text>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          Actionable+
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Use Face ID or Touch ID to unlock
        </Text>

        {error && (
          <Text style={[styles.error, { color: '#ef4444' }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.accent }]}
          onPress={authenticate}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BiometricLock;
