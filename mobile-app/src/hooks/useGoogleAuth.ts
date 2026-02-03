import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';

// Required for auth session to complete properly
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = '1081421927956-hti0r4oq9gafa2dqkn465s4f2fflhc4q.apps.googleusercontent.com';
const API_URL = 'https://app.actionableplus.com';

interface GoogleAuthResult {
  success: boolean;
  error?: string;
}

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  // Handle the OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setError('Google bejelentkezés sikertelen');
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      setIsLoading(false);
    }
  }, [response]);

  // Exchange Google token for our backend JWT
  const handleGoogleResponse = async (accessToken: string | undefined) => {
    if (!accessToken) {
      setError('Nem sikerült megszerezni a Google tokent');
      setIsLoading(false);
      return;
    }

    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Send to our backend for authentication
      const authResponse = await fetch(`${API_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          googleId: userInfo.id,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const authData = await authResponse.json();

      // Store the JWT token
      if (authData.token) {
        setToken(authData.token);
        if (authData.user) {
          setUser(authData.user);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err instanceof Error ? err.message : 'Hiba történt a bejelentkezés során');
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        setIsLoading(false);
        return { success: false, error: 'Bejelentkezés megszakítva' };
      }
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Ismeretlen hiba';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    error,
    isReady: !!request,
  };
}
