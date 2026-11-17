import { useEffect } from 'react';
import { View } from 'react-native';
import { useURL } from 'expo-linking';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimulationBanner, languageFromUrl, setLanguage } from '@pdfe/ui-native';

/**
 * Root layout: the banner sits above the navigator, so no screen or modal stack can cover it. The app language follows
 * a `lang` parameter in the link that opened it (`pdfe://?lang=en`); the language switch screen comes in the shells story.
 */
export default function RootLayout() {
  const url = useURL();
  useEffect(() => {
    const lang = languageFromUrl(url);
    if (lang) setLanguage(lang);
  }, [url]);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <SimulationBanner />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}
