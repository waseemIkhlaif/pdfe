import { Tabs } from 'expo-router';

/**
 * Bottom tabs: Home, Pay, Send, Markets, Profile. The tab buttons carry fixed test IDs (`tab-home`, ...), so tests
 * and the label flows do not depend on a language. Translated titles come with the i18n catalog in the shells story.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="pay" options={{ tabBarButtonTestID: 'tab-pay' }} />
      <Tabs.Screen name="send" options={{ tabBarButtonTestID: 'tab-send' }} />
      <Tabs.Screen name="markets" options={{ tabBarButtonTestID: 'tab-markets' }} />
      <Tabs.Screen name="profile" options={{ tabBarButtonTestID: 'tab-profile' }} />
    </Tabs>
  );
}
