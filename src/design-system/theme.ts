/**
 * Design System - Theme Configuration
 * 
 * Enterprise-grade theme with DKW System quality
 * Supports light/dark modes seamlessly
 */

export const theme = {
  // Spacing system (8px base unit)
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
    '4xl': '64px'
  },

  // Typography
  fonts: {
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'Fira Code', 'Courier New', monospace"
  },

  fontSizes: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '32px',
    '5xl': '48px'
  },

  fontWeights: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900
  },

  lineHeights: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  // Border radius
  radii: {
    none: '0',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none'
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    backdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600
  }
};

// Color palette
export const colors = {
  // Primary (Enterprise Blue)
  primary: {
    50: '#f0f5ff',
    100: '#e0ebff',
    200: '#c0d7ff',
    300: '#a0c3ff',
    400: '#7fa5ff',
    500: '#0066FF', // Main
    600: '#0052cc',
    700: '#003d99',
    800: '#002e66',
    900: '#001a33',
    950: '#000d1a'
  },

  // Secondary (Modern Teal)
  secondary: {
    50: '#f0fdfb',
    100: '#d4faf5',
    200: '#a8f5eb',
    300: '#6cf0dc',
    400: '#30e8cc',
    500: '#00D4AA', // Main
    600: '#00b896',
    700: '#009977',
    800: '#007a62',
    900: '#005944',
    950: '#003427'
  },

  // Neutral (Grays)
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },

  // Semantic colors
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#059669'
  },

  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706'
  },

  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#dc2626'
  },

  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8'
  },

  // Transparent
  transparent: 'transparent'
};

// Light mode
export const lightMode = {
  bg: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    quaternary: colors.neutral[200],
    overlay: 'rgba(0, 0, 0, 0.05)',
    backdrop: 'rgba(0, 0, 0, 0.4)'
  },

  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[500],
    inverse: colors.neutral[0],
    brand: colors.primary[600]
  },

  border: {
    light: colors.neutral[200],
    base: colors.neutral[300],
    dark: colors.neutral[400]
  },

  divider: colors.neutral[200]
};

// Dark mode
export const darkMode = {
  bg: {
    primary: colors.neutral[950],
    secondary: colors.neutral[900],
    tertiary: colors.neutral[800],
    quaternary: colors.neutral[700],
    overlay: 'rgba(255, 255, 255, 0.05)',
    backdrop: 'rgba(0, 0, 0, 0.6)'
  },

  text: {
    primary: colors.neutral[50],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
    inverse: colors.neutral[950],
    brand: colors.primary[400]
  },

  border: {
    light: colors.neutral[800],
    base: colors.neutral[700],
    dark: colors.neutral[600]
  },

  divider: colors.neutral[800]
};

export default {
  theme,
  colors,
  lightMode,
  darkMode
};
