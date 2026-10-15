
import { Stack } from "expo-router";
import React from "react";
import { AudioPlayerProvider } from "../context/AudioPlayerContext";

export default function RootLayout() {
  return (
    <AudioPlayerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="tabs" />
      </Stack>
    </AudioPlayerProvider>
  );
}
