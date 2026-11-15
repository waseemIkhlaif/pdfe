import { Tabs } from 'expo-router';

/** Bottom tabs: Home, Pay, Send, Markets, Profile. Titles come from the i18n catalog in the shells story. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="pay" />
      <Tabs.Screen name="send" />
      <Tabs.Screen name="markets" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
