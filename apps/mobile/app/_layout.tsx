import { View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimulationBanner } from '@pdfe/ui-native';

/** Root layout: the banner sits above the navigator, so no screen or modal stack can cover it. */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <SimulationBanner />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}
