import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@pdfe/design-tokens/dist/native/theme';
import { bannerText, getLanguage, subscribeLanguage } from './language';

/**
 * The simulation banner of the mobile app (FR-022): full width, a status region, on every screen. It shows the label
 * in the language of the app, exactly `SIMULATION — NOT REAL MONEY` or `محاكاة — ليست أموالاً حقيقية`, and its
 * accessibility label is that same text. It takes no props, so a screen cannot hide or change it. The root layout
 * renders it above the navigator, so no tab, screen or modal stack can cover it.
 */
export function SimulationBanner() {
  const lang = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  const text = bannerText(lang);
  return (
    <View
      role="status"
      accessible
      accessibilityLabel={text}
      testID="simulation-banner"
      style={styles.bar}
    >
      <Text style={[styles.text, { writingDirection: lang === 'ar' ? 'rtl' : 'ltr' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'stretch',
    backgroundColor: theme.color.simulation.accentBg,
    borderBottomColor: theme.color.simulation.accent,
    borderBottomWidth: 3,
    paddingHorizontal: theme.space['16'],
    paddingVertical: theme.space['4'],
    alignItems: 'center',
  },
  text: {
    color: theme.color.simulation.accentFg,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
});
