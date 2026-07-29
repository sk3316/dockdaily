import { useColorScheme } from 'react-native';
import { usePreferenceStore } from '@/store/usePreferenceStore';
import { Colors } from '@/constants/theme';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const theme = usePreferenceStore((s) => s.theme);

  const scheme =
    theme === 'system' ? (systemScheme ?? 'light') : theme;

  return {
    scheme,
    colors: Colors[scheme],
    isDark: scheme === 'dark',
  };
}