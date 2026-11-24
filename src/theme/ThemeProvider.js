import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadThemePreference, saveThemePreference } from '../services/themePreference';
import { palettes } from './palettes';

const ThemeContext = createContext({ theme: 'light', colors: palettes.light });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setCurrentTheme] = useState(null);
  const [persistenceError, setPersistenceError] = useState(null);
  const pendingWrite = useRef(Promise.resolve());
  const lastSelection = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    loadThemePreference().then((saved) => { if (active) setCurrentTheme(saved); });
    return () => { active = false; mounted.current = false; };
  }, []);

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark') return;
    const selection = ++lastSelection.current;
    setCurrentTheme(next);
    setPersistenceError(null);

    // Serializa las escrituras para que un toque anterior no sobrescriba el tema más reciente.
    pendingWrite.current = pendingWrite.current.then(async () => {
      try {
        await saveThemePreference(next);
      } catch {
        if (mounted.current && selection === lastSelection.current) {
          setPersistenceError('No se pudo guardar el tema. Intenta de nuevo.');
        }
      }
    });
    return pendingWrite.current;
  }, []);

  const value = useMemo(() => ({ theme, colors: palettes[theme], setTheme, persistenceError }),
    [theme, setTheme, persistenceError]);

  if (!theme) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
