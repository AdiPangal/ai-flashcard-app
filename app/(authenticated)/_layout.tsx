import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import CustomTabBar from '@/components/customTabBar';

export default function AuthenticatedLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(quizFlow)" />
        <Stack.Screen name="(flashcardFlow)" />
      </Stack>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

