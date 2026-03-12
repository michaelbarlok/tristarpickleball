import { Tabs } from "expo-router";
import { useColorScheme, View, Text, StyleSheet } from "react-native";

const ICONS: Record<string, { emoji: string; label: string }> = {
  club:      { emoji: "🏟️", label: "Club" },
  play:      { emoji: "🏓", label: "Play" },
  "sign-ups": { emoji: "📋", label: "Sign-Ups" },
  members:   { emoji: "👥", label: "Members" },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { emoji, label } = ICONS[name] ?? { emoji: "•", label: name };
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</Text>
      <Text style={[s.label, focused && s.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const isDark = useColorScheme() === "dark";

  return (
    <Tabs
      initialRouteName="club"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#1e293b" : "#f1f5f9",
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          paddingHorizontal: 8,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tabs.Screen name="club" />
      <Tabs.Screen name="play" />
      <Tabs.Screen name="sign-ups" />
      <Tabs.Screen name="members" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
  },
  iconWrapActive: {
    backgroundColor: "#ecfdf5",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  labelActive: {
    color: "#10b981",
  },
});
