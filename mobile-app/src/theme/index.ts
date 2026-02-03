/**
 * ActionablePlus Theme
 * Matches web CSS variables for consistent design
 */

export const colors = {
  light: {
    // Text
    textPrimary: '#0d0d0d',
    textSecondary: '#595959',
    textSecondaryAlt: '#6b6b6b',
    textTertiary: '#8c8c8c',

    // Surfaces
    surfacePrimary: '#ffffff',
    surfacePrimaryAlt: '#f7f7f8',
    surfaceSecondary: '#f0f0f0',
    surfaceHover: '#ececf1',
    surfaceActiveAlt: '#e5e5e5',
    surfaceChat: '#ffffff',

    // Borders
    borderLight: '#e3e3e3',
    borderMedium: '#cdcdcd',
    borderHeavy: '#999696',

    // Accent
    accent: '#10a37f',
    accentHover: '#0d8a6a',

    // Status
    destructive: '#ef4444',
    warning: '#f59e0b',
    success: '#10a37f',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    // Text
    textPrimary: '#ececec',
    textSecondary: '#999696',
    textSecondaryAlt: '#8c8c8c',
    textTertiary: '#6b6b6b',

    // Surfaces
    surfacePrimary: '#212121',
    surfacePrimaryAlt: '#171717',
    surfaceSecondary: '#2f2f2f',
    surfaceHover: '#2f2f2f',
    surfaceActiveAlt: '#3a3a3a',
    surfaceChat: '#212121',

    // Borders
    borderLight: '#424242',
    borderMedium: '#595959',
    borderHeavy: '#6b6b6b',

    // Accent
    accent: '#10a37f',
    accentHover: '#0d8a6a',

    // Status
    destructive: '#ef4444',
    warning: '#f59e0b',
    success: '#10a37f',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const layout = {
  sidebarWidth: 320,
  headerHeight: 40,
  conversationItemHeight: 48,
  touchTargetSize: 44,
  maxContentWidth: 768,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const animations = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  easing: {
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export type ThemeColors = typeof colors.light;
export type ColorScheme = 'light' | 'dark';
