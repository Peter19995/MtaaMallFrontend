// src/constants/theme.ts
export const AppTheme = {
  colors: {
    // Primary - Teal/Cyan based on #51c4d8
    primary: '#51c4d8',
    primaryDark: '#3a9eb0',      // Darker teal for hover/states
    primaryLight: '#8fd9e8',      // Lighter teal for backgrounds
    primarySoft: '#e0f2f7',       // Very soft teal for highlights

    // Secondary - Complementary coral/orange (opposite of teal on color wheel)
    secondary: '#ff8a5c',
    secondaryDark: '#e66a3a',
    secondaryLight: '#ffb89a',

    // Accent - Purple (triadic harmony with teal)
    accent: '#9b6b9e',
    accentDark: '#7b4f7e',
    accentLight: '#c39ac6',

    // Tertiary - Warm gold (analogous to secondary)
    tertiary: '#ffb347',
    tertiaryDark: '#e0942a',
    tertiaryLight: '#ffcf8a',

    // Quaternary - Soft blue (analogous to primary)
    quaternary: '#6c8cbf',
    quaternaryDark: '#4f6c9c',
    quaternaryLight: '#9bb2d9',

    // Background - Warm neutral that complements teal
    background: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    elevated: '#f1f7fa',

    // Text - Dark with slight blue undertone
    text: '#1e2b32',
    textSecondary: '#4a5b66',
    textTertiary: '#7f8e99',
    textInverse: '#ffffff',

    // Status colors - Adjusted to work with teal theme
    success: '#2e9a6e',           // Emerald green
    successDark: '#1f7a54',
    successLight: '#b8e6d0',

    warning: '#ffae42',           // Warm orange
    warningDark: '#e08c2a',
    warningLight: '#ffe0b2',

    error: '#e65c5c',             // Soft red
    errorDark: '#c43d3d',
    errorLight: '#ffcdd2',

    info: '#51c4d8',              // Using primary for info

    // UI Elements
    border: '#d9e2e9',
    divider: '#e6edf2',
    outline: '#b8d0da',

    // Gradients - Based on primary
    gradientPrimary: ['#51c4d8', '#3a9eb0'],
    gradientSecondary: ['#ff8a5c', '#e66a3a'],
    gradientAccent: ['#9b6b9e', '#7b4f7e'],
    gradientSuccess: ['#2e9a6e', '#1f7a54'],
    gradientWarning: ['#ffae42', '#e08c2a'],

    // Component specific gradients
    buttonGradient: ['#51c4d8', '#3a9eb0'],
    cardGradient: ['#ffffff', '#f1f7fa'],
    headerGradient: ['#51c4d8', '#3a9eb0'],

    // Semantic colors
    brand: '#51c4d8',
    positive: '#2e9a6e',
    negative: '#e65c5c',
    neutral: '#7f8e99',
    
    // Additional teal variations
    teal50: '#e6f4f8',
    teal100: '#c0e4ed',
    teal200: '#97d3e2',
    teal300: '#6ec2d7',
    teal400: '#51c4d8', // primary
    teal500: '#3a9eb0',
    teal600: '#2d7b8a',
    teal700: '#205a65',
    
    // Coral variations (secondary)
    coral50: '#fff1eb',
    coral100: '#ffd6c2',
    coral200: '#ffb89a',
    coral300: '#ff9a72',
    coral400: '#ff8a5c', // secondary
    coral500: '#e66a3a',
    coral600: '#c44e20',
    
    // Purple variations (accent)
    purple50: '#f5eef6',
    purple100: '#e3d1e5',
    purple200: '#d1b4d4',
    purple300: '#bf97c3',
    purple400: '#9b6b9e', // accent
    purple500: '#7b4f7e',
    purple600: '#5b395e',
  },

  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      light: 'System'
    },
    sizes: {
      xs: 11,
      sm: 13,
      md: 16,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      xxxl: 30
    },
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900'
    }
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48
  },

  borderRadius: {
    xs: 2,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    round: 9999
  },

  shadows: {
    sm: {
      shadowColor: '#1e2b32',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1
    },
    md: {
      shadowColor: '#1e2b32',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3
    },
    lg: {
      shadowColor: '#1e2b32',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6
    }
  },

  opacity: {
    disabled: 0.5,
    hover: 0.8,
    focus: 0.9,
    overlay: 0.6,
    subtle: 0.1,
    medium: 0.3,
    strong: 0.7
  },

  animation: {
    fast: 150,
    normal: 300,
    slow: 500
  }
} as const

export const withOpacity = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  // Handle rgb/rgba colors
  if (color.startsWith('rgb')) {
    const match = color.match(/[\d.]+/g)
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`
    }
  }
  
  return color
}

export const getContrastColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  let r, g, b
  
  if (backgroundColor.startsWith('#')) {
    r = parseInt(backgroundColor.slice(1, 3), 16)
    g = parseInt(backgroundColor.slice(3, 5), 16)
    b = parseInt(backgroundColor.slice(5, 7), 16)
  } else if (backgroundColor.startsWith('rgb')) {
    const match = backgroundColor.match(/[\d.]+/g)
    if (match && match.length >= 3) {
      r = parseInt(match[0])
      g = parseInt(match[1])
      b = parseInt(match[2])
    } else {
      return AppTheme.colors.text
    }
  } else {
    return AppTheme.colors.text
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? AppTheme.colors.text : AppTheme.colors.textInverse
}

export const semanticColors = {
  textForBackground: (bgColor: string) => {
    return getContrastColor(bgColor)
  },
  
  button: {
    primary: {
      background: AppTheme.colors.primary,
      text: '#ffffff',
      border: AppTheme.colors.primaryDark,
      hover: AppTheme.colors.primaryDark,
      active: AppTheme.colors.primaryDark,
      disabled: withOpacity(AppTheme.colors.primary, 0.5)
    },
    secondary: {
      background: AppTheme.colors.secondary,
      text: '#ffffff',
      border: AppTheme.colors.secondaryDark,
      hover: AppTheme.colors.secondaryDark,
      active: AppTheme.colors.secondaryDark,
      disabled: withOpacity(AppTheme.colors.secondary, 0.5)
    },
    accent: {
      background: AppTheme.colors.accent,
      text: '#ffffff',
      border: AppTheme.colors.accentDark,
      hover: AppTheme.colors.accentDark,
      active: AppTheme.colors.accentDark,
      disabled: withOpacity(AppTheme.colors.accent, 0.5)
    },
    outline: {
      background: 'transparent',
      text: AppTheme.colors.primary,
      border: AppTheme.colors.primary,
      hover: {
        background: AppTheme.colors.primarySoft,
        text: AppTheme.colors.primaryDark,
        border: AppTheme.colors.primaryDark
      },
      active: AppTheme.colors.primarySoft,
      disabled: withOpacity(AppTheme.colors.primary, 0.3)
    },
    ghost: {
      background: 'transparent',
      text: AppTheme.colors.primary,
      border: 'transparent',
      hover: {
        background: AppTheme.colors.primarySoft,
        text: AppTheme.colors.primaryDark
      },
      active: AppTheme.colors.primarySoft,
      disabled: withOpacity(AppTheme.colors.primary, 0.3)
    }
  },
  
  card: {
    default: {
      background: AppTheme.colors.surface,
      border: AppTheme.colors.border,
      shadow: AppTheme.shadows.sm
    },
    elevated: {
      background: AppTheme.colors.elevated,
      border: AppTheme.colors.divider,
      shadow: AppTheme.shadows.md
    },
    interactive: {
      background: AppTheme.colors.surface,
      border: AppTheme.colors.border,
      shadow: AppTheme.shadows.sm,
      hover: {
        border: AppTheme.colors.primaryLight,
        shadow: AppTheme.shadows.md
      }
    }
  },
  
  input: {
    default: {
      background: AppTheme.colors.surface,
      border: AppTheme.colors.border,
      text: AppTheme.colors.text,
      placeholder: AppTheme.colors.textTertiary,
      focus: {
        border: AppTheme.colors.primary,
        shadow: `0 0 0 3px ${withOpacity(AppTheme.colors.primary, 0.2)}`
      },
      error: {
        border: AppTheme.colors.error,
        shadow: `0 0 0 3px ${withOpacity(AppTheme.colors.error, 0.2)}`
      },
      disabled: {
        background: AppTheme.colors.background,
        border: AppTheme.colors.divider,
        text: AppTheme.colors.textTertiary
      }
    }
  },
  
  navigation: {
    active: AppTheme.colors.primary,
    inactive: AppTheme.colors.textSecondary,
    hover: AppTheme.colors.primaryLight,
    background: AppTheme.colors.surface,
    border: AppTheme.colors.border
  },
  
  status: {
    success: {
      background: AppTheme.colors.successLight,
      text: AppTheme.colors.successDark,
      border: AppTheme.colors.success
    },
    warning: {
      background: AppTheme.colors.warningLight,
      text: AppTheme.colors.warningDark,
      border: AppTheme.colors.warning
    },
    error: {
      background: AppTheme.colors.errorLight,
      text: AppTheme.colors.errorDark,
      border: AppTheme.colors.error
    },
    info: {
      background: AppTheme.colors.primarySoft,
      text: AppTheme.colors.primaryDark,
      border: AppTheme.colors.primary
    }
  },
  
  badge: {
    primary: {
      background: AppTheme.colors.primary,
      text: '#ffffff'
    },
    secondary: {
      background: AppTheme.colors.secondary,
      text: '#ffffff'
    },
    accent: {
      background: AppTheme.colors.accent,
      text: '#ffffff'
    },
    success: {
      background: AppTheme.colors.success,
      text: '#ffffff'
    },
    warning: {
      background: AppTheme.colors.warning,
      text: '#1e2b32'
    },
    error: {
      background: AppTheme.colors.error,
      text: '#ffffff'
    }
  },
  
  alert: {
    success: {
      background: AppTheme.colors.successLight,
      border: AppTheme.colors.success,
      icon: AppTheme.colors.success,
      text: AppTheme.colors.successDark
    },
    warning: {
      background: AppTheme.colors.warningLight,
      border: AppTheme.colors.warning,
      icon: AppTheme.colors.warning,
      text: AppTheme.colors.warningDark
    },
    error: {
      background: AppTheme.colors.errorLight,
      border: AppTheme.colors.error,
      icon: AppTheme.colors.error,
      text: AppTheme.colors.errorDark
    },
    info: {
      background: AppTheme.colors.primarySoft,
      border: AppTheme.colors.primary,
      icon: AppTheme.colors.primary,
      text: AppTheme.colors.primaryDark
    }
  },
  
  chart: {
    colors: [
      AppTheme.colors.primary,
      AppTheme.colors.secondary,
      AppTheme.colors.accent,
      AppTheme.colors.tertiary,
      AppTheme.colors.quaternary,
      AppTheme.colors.success,
      '#ff9f7c', // coral variation
      '#b583b8', // purple variation
      '#6fa3d9', // blue variation
      '#ffc857'  // gold variation
    ],
    gradients: {
      primary: [AppTheme.colors.primary, withOpacity(AppTheme.colors.primary, 0.2)],
      secondary: [AppTheme.colors.secondary, withOpacity(AppTheme.colors.secondary, 0.2)],
      accent: [AppTheme.colors.accent, withOpacity(AppTheme.colors.accent, 0.2)]
    }
  }
} as const

// Utility functions for theme consumption
export const getThemeValue = (path: string, theme: typeof AppTheme = AppTheme) => {
  return path.split('.').reduce((acc: any, part) => acc?.[part], theme)
}

export const createStyles = <T extends Record<string, any>>(
  styles: T | ((theme: typeof AppTheme) => T)
): T | ((theme: typeof AppTheme) => T) => {
  return styles
}