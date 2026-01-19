import { Stack } from 'expo-router';

export default function UnauthenticatedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="passwordRecovery" />
      <Stack.Screen name="resetPassword" />
    </Stack>
  );
}

