import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuthStore } from '../store';
import { colors } from '../theme';

const API_URL = 'https://app.actionableplus.com';

interface ChatWebViewProps {
  conversationId?: string | null;
  onMessage?: (data: WebViewMessage) => void;
  colorScheme: 'light' | 'dark';
}

interface WebViewMessage {
  type: string;
  payload?: unknown;
}

interface AuthPayload {
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const ChatWebView: React.FC<ChatWebViewProps> = ({
  conversationId,
  onMessage,
  colorScheme,
}) => {
  const webViewRef = useRef<WebView>(null);
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(true);

  // Native Google Sign-In hook
  const { signInWithGoogle, isLoading: googleLoading, error: googleError, isReady: googleReady } = useGoogleAuth();

  // Show error if Google auth fails
  useEffect(() => {
    if (googleError) {
      Alert.alert('Bejelentkezési hiba', googleError);
    }
  }, [googleError]);

  // Reload WebView when token changes (after native auth)
  useEffect(() => {
    if (token && webViewRef.current) {
      // Token was set (possibly from native Google auth), reload to apply
      webViewRef.current.reload();
    }
  }, [token]);

  // Handle navigation requests - intercept Google OAuth for native sign-in
  const handleShouldStartLoad = useCallback((request: WebViewNavigation): boolean => {
    const { url } = request;

    // Check if this is a Google OAuth URL - use native sign-in instead
    if (url.includes('/oauth/google') && !url.includes('callback')) {
      // Trigger native Google Sign-In
      if (googleReady) {
        signInWithGoogle();
      }
      return false; // Prevent WebView from navigating
    }

    return true; // Allow all other URLs
  }, [googleReady, signInWithGoogle]);

  // Build the URL based on whether we have a conversation
  const url = conversationId
    ? `${API_URL}/c/${conversationId}`
    : `${API_URL}/c/new`;

  // Inject auth token into WebView after load
  const injectAuth = useCallback(() => {
    if (!webViewRef.current) return;

    // If we have a stored token, inject it
    if (token) {
      const script = `
        (function() {
          try {
            // Set token in localStorage (LibreChat stores JWT here)
            localStorage.setItem('token', '${token}');

            // Also set in window for any direct access
            window.__ACTIONABLEPLUS_TOKEN__ = '${token}';

            // Notify the app that token is ready
            window.dispatchEvent(new CustomEvent('tokenInjected'));

            // Signal to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'AUTH_READY'
              }));
            }
          } catch (e) {
            console.error('Token injection failed:', e);
          }
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [token]);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data: WebViewMessage = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'AUTH_READY':
            console.log('WebView auth ready');
            break;

          case 'AUTH_TOKEN_CAPTURED':
            // Token captured from login response - save to SecureStore
            const authPayload = data.payload as AuthPayload;
            if (authPayload?.token) {
              console.log('Token captured from WebView login');
              setToken(authPayload.token);
              if (authPayload.user) {
                setUser(authPayload.user);
              }
            }
            break;

          case 'AUTH_TOKEN_CHANGED':
            // Token changed in localStorage (refresh, etc.)
            const tokenPayload = data.payload as { token: string };
            if (tokenPayload?.token && tokenPayload.token !== token) {
              console.log('Token updated from WebView');
              setToken(tokenPayload.token);
            }
            break;

          case 'NAVIGATION':
            // Handle navigation requests from web app
            break;

          case 'NEW_MESSAGE':
            // Could trigger local notification for background messages
            break;

          case 'LOGOUT':
            // Handle logout from web app - clear SecureStore
            console.log('Logout triggered from WebView');
            logout();
            break;
        }

        onMessage?.(data);
      } catch (e) {
        console.error('Failed to parse WebView message:', e);
      }
    },
    [onMessage, token, setToken, setUser, logout]
  );

  // Script to inject for WebView → Native communication
  const injectedJavaScript = `
    (function() {
      // ============================================
      // AUTH INTERCEPTION - Capture JWT from login
      // ============================================

      // Intercept fetch to capture auth responses
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);

        try {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

          // Check if this is an auth endpoint (login, register, refresh)
          if (url.includes('/api/auth/login') ||
              url.includes('/api/auth/register') ||
              url.includes('/api/auth/refresh')) {

            // Clone response to read body without consuming it
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();

            // If login/register succeeded with a token
            if (data.token && window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'AUTH_TOKEN_CAPTURED',
                payload: {
                  token: data.token,
                  refreshToken: data.refreshToken,
                  user: data.user
                }
              }));
            }
          }

          // Check for logout
          if (url.includes('/api/auth/logout')) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOGOUT'
              }));
            }
          }
        } catch (e) {
          // Ignore parsing errors for non-JSON responses
        }

        return response;
      };

      // Monitor localStorage for token changes (handles refresh, etc.)
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);

        if (key === 'token' && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'AUTH_TOKEN_CHANGED',
            payload: { token: value }
          }));
        }
      };

      // Monitor for logout via localStorage clear
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = function(key) {
        originalRemoveItem.apply(this, arguments);

        if (key === 'token' && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOGOUT'
          }));
        }
      };

      // ============================================
      // NAVIGATION INTERCEPTION
      // ============================================

      // Listen for navigation changes
      const originalPushState = history.pushState;
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'NAVIGATION',
            payload: { url: window.location.href }
          }));
        }
      };

      // Listen for new messages (hook into app events)
      window.addEventListener('newMessage', (e) => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'NEW_MESSAGE',
            payload: e.detail
          }));
        }
      });

      // ============================================
      // UI ADJUSTMENTS FOR NATIVE APP
      // ============================================

      // Inject CSS for immediate effect
      const style = document.createElement('style');
      style.textContent = \`
        /* Hide footer */
        [role="contentinfo"] {
          display: none !important;
        }

        /* Reduce padding on mobile - chat messages */
        .md\\:px-5 {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        /* Chat container padding */
        [class*="px-3"], [class*="px-4"], [class*="px-5"] {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        /* Message content area */
        .mx-auto {
          padding-left: 8px !important;
          padding-right: 8px !important;
        }

        /* Fix error messages - prevent horizontal scroll */
        .error-message,
        [class*="error"],
        [class*="Error"],
        pre,
        code {
          max-width: 100vw !important;
          overflow-x: auto !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          white-space: pre-wrap !important;
        }

        /* Prevent any element from causing horizontal scroll */
        body {
          overflow-x: hidden !important;
        }

        * {
          max-width: 100vw;
        }
      \`;
      document.head.appendChild(style);

      true;
    })();
  `;

  const themeColors = colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surfaceChat }]}>
      {(isLoading || googleLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoad={() => {
          injectAuth();
          setIsLoading(false);
        }}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        // Performance optimizations
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        cacheEnabled
        // iOS specific
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        // Android specific
        overScrollMode="never"
        // Security
        originWhitelist={['https://*']}
        // Error handling
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default ChatWebView;
