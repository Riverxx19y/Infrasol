import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

export function useThemedStyles(createStyles) {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [createStyles, colors]);
}
