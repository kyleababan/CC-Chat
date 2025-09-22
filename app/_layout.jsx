// app/_layout.jsx
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth routes */}
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />

      {/* Main app routes */}
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />

      {/* Chat routes */}
      <Stack.Screen name="chat" />   {/* 👈 added */}

      {/* Extra routes */}
      <Stack.Screen name="not-verified" /> 
    </Stack>
  );
}
