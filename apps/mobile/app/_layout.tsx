import { useEffect } from 'react';
import { View } from 'react-native';
import { useURL } from 'expo-linking';
import { Slot, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimulationBanner, languageFromUrl, parseLanguage, setLanguage } from '@pdfe/ui-native';

/**
 * Root layout: the banner sits above the navigator, so no screen or modal stack can cover it. The app language follows
 * a `lang` parameter in the link that opened it (`pdfe://?lang=en`); the language switch screen comes in the shells story.
 * The router's own search parameters are read first, because they hold whatever link the router handled, whenever it
 * arrived; the raw link event is the fallback.
 */
export default function RootLayout() {
  const url = useURL();
  const params = useGlobalSearchParams<{ lang?: string | string[] }>();
  const fromRouter = parseLanguage(Array.isArray(params.lang) ? params.lang[0] : params.lang);
  useEffect(() => {
    const lang = fromRouter ?? languageFromUrl(url);
    if (lang) setLanguage(lang);
  }, [fromRouter, url]);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <SimulationBanner />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}
