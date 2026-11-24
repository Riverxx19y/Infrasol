import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@infrasol/theme';

export async function loadThemePreference() {
  try {
    return (await AsyncStorage.getItem(THEME_KEY)) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export async function saveThemePreference(theme) {
  await AsyncStorage.setItem(THEME_KEY, theme);
}
