import './config/firebase';
import { StatusBar } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function AppContent() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}
