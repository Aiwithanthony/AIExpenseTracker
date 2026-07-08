import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'auto';

export type AccentColorKey = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'green' | 'teal' | 'indigo';

interface AccentColorSet {
  light: { primary: string; accent: string; accentLight: string };
  dark: { primary: string; accent: string; accentLight: string };
  label: string;
  swatch: string;
}

// Warm Bento accent palette — muted, cozy hues tuned for the cream (#F7F2EC)
// and warm-charcoal (#161310) canvases. Keys are unchanged so saved
// preferences in AsyncStorage stay valid; only the hues themselves moved from
// bright system colors to warm bento ones. Indigo is the signature default.
export const ACCENT_COLORS: Record<AccentColorKey, AccentColorSet> = {
  indigo: {
    label: 'Indigo',
    swatch: '#5A57E6',
    light: { primary: '#5A57E6', accent: '#5A57E6', accentLight: '#7A78EC' },
    dark: { primary: '#7D7AF0', accent: '#7D7AF0', accentLight: '#9A98F5' },
  },
  blue: {
    label: 'Denim',
    swatch: '#3B6FB5',
    light: { primary: '#3B6FB5', accent: '#3B6FB5', accentLight: '#5C8AC9' },
    dark: { primary: '#6FA0E8', accent: '#6FA0E8', accentLight: '#8FB6EF' },
  },
  purple: {
    label: 'Plum',
    swatch: '#8B5FBF',
    light: { primary: '#8B5FBF', accent: '#8B5FBF', accentLight: '#A37DD1' },
    dark: { primary: '#B08FE0', accent: '#B08FE0', accentLight: '#C3A8EA' },
  },
  pink: {
    label: 'Rose',
    swatch: '#C9647F',
    light: { primary: '#C9647F', accent: '#C9647F', accentLight: '#D8829A' },
    dark: { primary: '#E794AC', accent: '#E794AC', accentLight: '#F0AFC1' },
  },
  red: {
    label: 'Terracotta',
    swatch: '#C75B45',
    light: { primary: '#C75B45', accent: '#C75B45', accentLight: '#D57862' },
    dark: { primary: '#E8886F', accent: '#E8886F', accentLight: '#F0A48F' },
  },
  orange: {
    label: 'Caramel',
    swatch: '#BE7419',
    light: { primary: '#BE7419', accent: '#BE7419', accentLight: '#D18B33' },
    dark: { primary: '#E9A448', accent: '#E9A448', accentLight: '#F2BC6E' },
  },
  green: {
    label: 'Sage',
    swatch: '#4E8A5F',
    light: { primary: '#4E8A5F', accent: '#4E8A5F', accentLight: '#699F78' },
    dark: { primary: '#7FBC8C', accent: '#7FBC8C', accentLight: '#9CCDA7' },
  },
  teal: {
    label: 'Eucalyptus',
    swatch: '#3D8E87',
    light: { primary: '#3D8E87', accent: '#3D8E87', accentLight: '#58A39C' },
    dark: { primary: '#6BBDB5', accent: '#6BBDB5', accentLight: '#8FCFC8' },
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    border: string;
    borderStrong: string;
    card: string;
    inputBg: string;
    error: string;
    success: string;
    warning: string;
    accent: string;
    accentLight: string;
    pill: string;
    pillText: string;
    tintWarm: string;
    tintWarmText: string;
    tintCool: string;
    tintCoolText: string;
  };
  setTheme: (theme: Theme) => void;
  accentColor: AccentColorKey;
  setAccentColor: (color: AccentColorKey) => void;
}

// "Warm Bento" light palette — warm cream canvas, white cards, warm ink text.
// No pure black; semantic green/red are deepened so they read friendly (not neon) on cream.
const lightColors = {
  background: '#F7F2EC',    // Warm cream canvas
  surface: '#FFFDF9',       // Warm off-white (nav bars, headers)
  text: '#2E2823',          // Warm ink
  textSecondary: '#8A7F73', // Warm taupe
  textTertiary: '#B8AC9E',  // Light warm gray
  primary: '#5A57E6',       // Default accent — indigo (overridden by user accent choice)
  border: 'rgba(94,74,54,0.08)',  // Warm hairline
  borderStrong: '#E7DCCF',        // Visible warm border (chips, outlines)
  card: '#FFFFFF',          // Bento cards pop white against cream
  inputBg: '#F4EDE3',       // Warm input/inset fill
  error: '#E0503C',         // Warm red (expense)
  success: '#2F9E63',       // Deep friendly green (income)
  warning: '#E8890C',
  accent: '#5A57E6',
  accentLight: '#7A78EC',
  pill: '#EFE7DB',
  pillText: '#7A6F62',
  tintWarm: '#FBE5D6',      // Peach tint card (e.g. Spent)
  tintWarmText: '#9C5636',
  tintCool: '#DDF0E5',      // Mint tint card (e.g. Saved)
  tintCoolText: '#37714F',
};

// "Warm Bento" dark palette — warm charcoal (not blue-black) with cream-tinted text.
const darkColors = {
  background: '#161310',    // Warm near-black
  surface: '#201C17',       // Warm dark surface (nav bars, headers)
  text: '#F3EDE4',          // Warm cream text
  textSecondary: '#A5998A',
  textTertiary: '#6F675C',
  primary: '#7D7AF0',       // Default accent — indigo (overridden by user accent choice)
  border: 'rgba(255,240,220,0.08)',
  borderStrong: '#3A342C',
  card: '#211D18',          // Warm dark cards
  inputBg: '#2B2620',
  error: '#FF7A66',
  success: '#63D89A',
  warning: '#FFB03A',
  accent: '#7D7AF0',
  accentLight: '#9A98F5',
  pill: '#2B2620',
  pillText: '#A5998A',
  tintWarm: '#3B2A1F',
  tintWarmText: '#F0B08C',
  tintCool: '#20332A',
  tintCoolText: '#8FD6AE',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [accentColor, setAccentColorState] = useState<AccentColorKey>('indigo');

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (theme === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme, systemColorScheme]);

  const loadPreferences = async () => {
    try {
      const [savedTheme, savedAccent] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('accentColor'),
      ]);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto')) {
        setThemeState(savedTheme as Theme);
      }
      if (savedAccent && savedAccent in ACCENT_COLORS) {
        setAccentColorState(savedAccent as AccentColorKey);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem('theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setAccentColor = async (newAccent: AccentColorKey) => {
    try {
      await AsyncStorage.setItem('accentColor', newAccent);
      setAccentColorState(newAccent);
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  };

  const colors = useMemo(() => {
    const baseColors = isDark ? darkColors : lightColors;
    const accentSet = isDark
      ? ACCENT_COLORS[accentColor].dark
      : ACCENT_COLORS[accentColor].light;
    return {
      ...baseColors,
      primary: accentSet.primary,
      accent: accentSet.accent,
      accentLight: accentSet.accentLight,
    };
  }, [isDark, accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
