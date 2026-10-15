

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap =
            "home-outline";

          if (route.name === "index") {
            iconName = "home-outline";
          } else if (route.name === "songs") {
            iconName = "musical-notes-outline";
          } else if (route.name === "artists") {
            iconName = "people-outline";
          } else if (route.name === "albums") {
            iconName = "albums-outline";
          } else if (route.name === "search") {
            iconName = "search-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home" }}
      />

      <Tabs.Screen
        name="songs"
        options={{ title: "Songs" }}
      />

      <Tabs.Screen
        name="artists"
        options={{ title: "Artists" }}
      />

      <Tabs.Screen
        name="albums"
        options={{ title: "Albums" }}
      />

      <Tabs.Screen
        name="search"
        options={{ title: "Search" }}
      />

      <Tabs.Screen
        name="player"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}