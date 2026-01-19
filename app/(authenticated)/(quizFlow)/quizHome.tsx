import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthenticationButton from "@/components/buttons/authenticationButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Quiz, QuizQuestion } from "@/types";
import { getTabBarPadding } from '@/utils/tabBarHelpers';

export default function QuizHome() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ quizIndex: string }>();
  const quizIndex = params.quizIndex ? parseInt(params.quizIndex, 10) : null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (quizIndex === null || quizIndex < 0) {
      Alert.alert("Error", "Invalid quiz index");
      router.back();
      return;
    }
    fetchQuiz();
  }, [userId, quizIndex]);

  const fetchQuiz = async () => {
    if (!userId || !db || quizIndex === null) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const quizzes = userData.history?.quizzes || [];
        if (quizIndex >= quizzes.length) {
          Alert.alert("Error", "Quiz not found");
          router.back();
          return;
        }
        const quiz = quizzes[quizIndex];
        setQuiz(quiz);
        
        // Update lastAccessed timestamp when quiz is opened
        const updatedQuizzes = [...quizzes];
        updatedQuizzes[quizIndex] = {
          ...quiz,
          lastAccessed: Timestamp.now(),
        };
        await updateDoc(userRef, {
          "history.quizzes": updatedQuizzes,
        });
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      Alert.alert("Error", "Failed to load quiz");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp): string => {
    if (!timestamp || !timestamp.toDate) {
      return "Unknown date";
    }
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getQuestionTypes = (): string[] => {
    if (!quiz) return [];
    const types = new Set<string>();
    quiz.questionsList.forEach((q) => {
      if (q.type === "multiple-choice") types.add("Multiple Choice");
      else if (q.type === "multiple-selection") types.add("Multiple Selection");
      else if (q.type === "fill-in-the-blank") types.add("Fill in the Blank");
    });
    return Array.from(types);
  };

  const findFirstUnansweredQuestion = (): number => {
    if (!quiz) return 0;
    const firstUnanswered = quiz.questionsList.findIndex((q) => {
      if (Array.isArray(q.currentAnswer)) {
        return q.currentAnswer.length === 0;
      }
      return !q.currentAnswer || q.currentAnswer.trim() === "";
    });
    return firstUnanswered >= 0 ? firstUnanswered : quiz.lastQuestionIndex || 0;
  };

  const handleStartQuiz = () => {
    // Placeholder navigation - will implement quizQuestion later
    router.push({
      pathname: "/(authenticated)/(quizFlow)/quizQuestion",
      params: {
        quizIndex: quizIndex!.toString(),
        questionIndex: "0",
      },
    });
  };

  const handleContinueQuiz = () => {
    const questionIndex = findFirstUnansweredQuestion();
    router.push({
      pathname: "/(authenticated)/(quizFlow)/quizQuestion",
      params: {
        quizIndex: quizIndex!.toString(),
        questionIndex: questionIndex.toString(),
      },
    });
  };

  const handleSeeResults = () => {
    // Placeholder navigation - will implement quizResults later
    router.push({
      pathname: "/(authenticated)/(quizFlow)/quizResults",
      params: {
        quizIndex: quizIndex!.toString(),
      },
    });
  };

  const handleRetakeQuiz = async () => {
    if (!quiz || !userId || !db || quizIndex === null) return;

    Alert.alert(
      "Retake Quiz",
      "This will reset all your answers. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setResetting(true);
              const userRef = doc(db, "users", userId);
              const userDoc = await getDoc(userRef);

              if (!userDoc.exists()) {
                Alert.alert("Error", "User not found");
                return;
              }

              const userData = userDoc.data();
              const quizzes = userData.history?.quizzes || [];
              const updatedQuiz = { ...quizzes[quizIndex] };

              // Reset quiz data
              updatedQuiz.isComplete = false;
              updatedQuiz.score = 0;
              updatedQuiz.lastQuestionIndex = 0;
              // Ensure bookmarkedQuestions exists (defensive check for legacy data)
              updatedQuiz.bookmarkedQuestions = updatedQuiz.bookmarkedQuestions || [];
              updatedQuiz.questionsList = updatedQuiz.questionsList.map((q: QuizQuestion) => ({
                ...q,
                currentAnswer: q.type === "multiple-selection" ? [] : "",
              }));

              // Update Firestore
              const newQuizzes = [...quizzes];
              newQuizzes[quizIndex] = updatedQuiz;

              await updateDoc(userRef, {
                "history.quizzes": newQuizzes,
              });

              setQuiz(updatedQuiz);

              // Navigate to first question
              router.push({
                pathname: "/(authenticated)/(quizFlow)/quizQuestion",
                params: {
                  quizIndex: quizIndex.toString(),
                  questionIndex: "0",
                },
              });
            } catch (error) {
              console.error("Error resetting quiz:", error);
              Alert.alert("Error", "Failed to reset quiz");
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !quiz) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading quiz...</Text>
        </View>
      </View>
    );
  }

  // Determine quiz state
  const allAnswersEmpty = quiz.questionsList.every((q) => {
    if (Array.isArray(q.currentAnswer)) {
      return q.currentAnswer.length === 0;
    }
    return !q.currentAnswer || q.currentAnswer.trim() === "";
  });

  const isNotStarted = !quiz.isComplete && allAnswersEmpty;
  const isIncomplete = !quiz.isComplete && !allAnswersEmpty;
  const isComplete = quiz.isComplete;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>Quiz Home</Text>
      </View>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.secondaryContainer, { paddingBottom: getTabBarPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.quizInfoContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Quiz Info</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Questions:</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{quiz.questionsList.length}</Text>
          </View>
          <View style={styles.questionTypesContainer}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Question Types:</Text>
            <View style={styles.questionTypesPills}>
              {getQuestionTypes().length > 0 ? (
                getQuestionTypes().map((type, index) => (
                  <View key={index} style={[styles.questionTypePill, { backgroundColor: colors.brandPrimaryDark, borderColor: colors.border }]}>
                    <Text style={[styles.questionTypeText, { color: colors.brandPrimary }]}>{type}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.noTypesText, { color: colors.textSecondary }]}>N/A</Text>
              )}
            </View>
          </View>
          <View style={styles.questionTypesContainer}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tags:</Text>
            <View style={styles.questionTypesPills}>
              {quiz.tags.length > 0 ? (
                quiz.tags.map((tag, index) => (
                  <View key={index} style={[styles.questionTypePill, { backgroundColor: colors.brandPrimaryDark, borderColor: colors.border }]}>
                    <Text style={[styles.questionTypeText, { color: colors.brandPrimary }]}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.noTypesText, { color: colors.textSecondary }]}>N/A</Text>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Last Accessed:</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(quiz.lastAccessed)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Created::</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(quiz.creationDate)}</Text>
          </View>
          {isComplete && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Score:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{quiz.score}%</Text>
            </View>
          )}
        </View>
    
        {/* Buttons for quiz */}
        {isNotStarted && (
          <AuthenticationButton
            onPress={handleStartQuiz}
            title="Start Quiz"
            disabled={resetting}
          />
        )}

        {isIncomplete && (
          <AuthenticationButton
            onPress={handleContinueQuiz}
            title="Continue Quiz"
            disabled={resetting}
          />
        )}

        {isComplete && (
          <View style={styles.completeButtonsContainer}>
            <View style={styles.buttonWrapper}>
              <AuthenticationButton
                onPress={handleSeeResults}
                title="See Results"
                disabled={resetting}
              />
            </View>
            <View style={styles.buttonSpacer} />
            <View style={styles.buttonWrapper}>
              <AuthenticationButton
                onPress={handleRetakeQuiz}
                title="Retake Quiz"
                disabled={resetting}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    height: "100%",
    width: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginTop: 70,
  },
  titleText: {
    fontSize: 50,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  secondaryContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  quizInfoContainer: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 10,
    width: "100%",
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: "Inter",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: "Inter",
    flex: 1,
    textAlign: "right",
  },
  questionTypesContainer: {
    marginBottom: 12,
  },
  questionTypesPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  questionTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionTypeText: {
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  noTypesText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontStyle: "italic",
  },
  completeButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
  },
  buttonWrapper: {
    flex: 1,
  },
  buttonSpacer: {
    width: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Inter",
  },
});
