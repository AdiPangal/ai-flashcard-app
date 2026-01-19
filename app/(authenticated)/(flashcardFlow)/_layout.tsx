import { Stack } from "expo-router";

export default function FlashcardFlowLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="flashcardHome" />
            <Stack.Screen name="flashcardQuestion" />
            <Stack.Screen name="flashcardResults" />
        </Stack>
    )
}