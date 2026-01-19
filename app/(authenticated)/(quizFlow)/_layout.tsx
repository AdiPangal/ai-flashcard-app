import { Stack } from "expo-router";

export default function QuizFlowLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="quizHome" />
            <Stack.Screen name="quizQuestion" />
            <Stack.Screen name="quizResults" />
            <Stack.Screen name="quizReview" />
        </Stack>
    )
}