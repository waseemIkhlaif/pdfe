import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@pdfe/design-tokens/dist/native/theme';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';

/**
 * Minimal banner (feature 001). No props, so a screen cannot hide or change it.
 * The final, locale-aware version replaces it in the labelling story.
 */
export function SimulationBanner() {
  return (
    <View
      role="status"
      accessible
      accessibilityLabel={`${SIM_LABEL_EN} / ${SIM_LABEL_AR}`}
      testID="simulation-banner"
      style={styles.bar}
    >
      <Text style={styles.text}>{SIM_LABEL_EN}</Text>
      <Text style={styles.text}>{SIM_LABEL_AR}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
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
