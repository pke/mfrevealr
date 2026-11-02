import React from 'react';
import {useColorScheme} from 'react-native';

// WCAG AA on each surface: secondary text and the progress bar keep at least
// 4.5:1 and 3:1. The brand yellow only reaches that on dark surfaces.
export const LIGHT = {
  surface: '#FFFFFF',
  text: '#1C1C1E',
  secondary: '#5F5E5A',
  track: '#E5E5EA',
  accent: '#A15C00',
  onAccent: '#FFFFFF',
};
export const DARK = {
  surface: '#1C1C1E',
  text: '#FFFFFF',
  secondary: '#AEAEB2',
  track: '#3A3A3C',
  accent: '#FEDD01',
  onAccent: '#1C1C1E',
};
export type Palette = typeof LIGHT;

export type ThemePreference = 'system' | 'light' | 'dark';

const ThemeContext = React.createContext<ThemePreference>('system');
export const ThemeProvider = ThemeContext.Provider;

/** The palette for the chosen theme, following the phone unless overridden. */
export function usePalette(): Palette {
  const preference = React.useContext(ThemeContext);
  const system = useColorScheme();
  const dark =
    preference === 'system' ? system === 'dark' : preference === 'dark';
  return dark ? DARK : LIGHT;
}
