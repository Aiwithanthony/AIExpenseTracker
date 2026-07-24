import React from 'react';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
// Import location tracking service to register background task
import './src/services/locationTracking';

export default function App() {
  // App font: Elms Sans, bundled locally from assets/fonts (6 weights, no
  // network/Google fetch). The keys here are the family names referenced by the
  // Text/TextInput wrappers in components/AppText (WEIGHT_TO_FAMILY).
  const [fontsLoaded, fontError] = useFonts({
    'ElmsSans-Light': require('./assets/fonts/ElmsSans-Light.ttf'),
    'ElmsSans-Regular': require('./assets/fonts/ElmsSans-Regular.ttf'),
    'ElmsSans-Medium': require('./assets/fonts/ElmsSans-Medium.ttf'),
    'ElmsSans-SemiBold': require('./assets/fonts/ElmsSans-SemiBold.ttf'),
    'ElmsSans-Bold': require('./assets/fonts/ElmsSans-Bold.ttf'),
    'ElmsSans-ExtraBold': require('./assets/fonts/ElmsSans-ExtraBold.ttf'),
  });

  // Hold on the splash screen until the font is ready; if loading errors we
  // proceed and the app renders with the system font instead.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <AppNavigator />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
