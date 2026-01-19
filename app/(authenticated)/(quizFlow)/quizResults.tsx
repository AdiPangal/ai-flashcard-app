import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthenticationButton from "@/components/buttons/authenticationButton";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { checkAnswer as checkAnswerHelper } from "@/utils/quizHelpers";
import { Quiz, QuizQuestion, IncorrectQuestion } from "@/types";
import { getTabBarPadding } from '@/utils/tabBarHelpers';

// Accordion Item Component with Animation
function AccordionItem({ 
  question, 
  isExpanded, 
  onToggle,
  formatAnswer
}: { 
  question: IncorrectQuestion; 
  isExpanded: boolean; 
  onToggle: () => void;
  formatAnswer: (answer: string | string[]) => string;
}) {
  const { colors } = useTheme();
  const height = useSharedValue(0);
  const contentHeightRef = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      // Use stored content height
      if (contentHeightRef.value > 0) {
        height.value = withTiming(contentHeightRef.value, { duration: 300 });
      }
    } else {
      height.value = withTiming(0, { duration: 300 });
    }
  }, [isExpanded]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      overflow: 'hidden',
    };
  });

  const animatedChevronStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      height.value,
      [0, contentHeightRef.value],
      [0, 180]
    );
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const handleContentLayout = (event: any) => {
    const { height: layoutHeight } = event.nativeEvent.layout;
    if (layoutHeight > 0 && contentHeightRef.value !== layoutHeight) {
      contentHeightRef.value = layoutHeight;
      // If currently expanded, immediately update to the measured height
      if (isExpanded) {
        height.value = withTiming(layoutHeight, { duration: 300 });
      }
    }
  };

  return (
    <View style={[styles.accordionItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <Pressable
        style={styles.accordionHeader}
        onPress={onToggle}
      >
        <Text style={[styles.accordionQuestionText, { color: colors.textPrimary }]}>
          Question {question.index + 1}
        </Text>
        <Animated.View style={animatedChevronStyle}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textPrimary}
          />
        </Animated.View>
      </Pressable>
      {/* Hidden measurement view - always rendered to get height */}
      <View style={{ position: 'absolute', opacity: 0, zIndex: -1 }} pointerEvents="none">
        <View 
          style={[styles.accordionContent, { borderTopColor: colors.border }]} 
          onLayout={handleContentLayout}
        >
          <Text style={[styles.questionText, { color: colors.textPrimary }]}>{question.question}</Text>
          <View style={styles.answerSection}>
            <View style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Your Answer:</Text>
              <Text style={[styles.incorrectAnswerText, { color: colors.error }]}>
                {formatAnswer(question.userAnswer)}
              </Text>
            </View>
            <View style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Correct Answer:</Text>
              <Text style={[styles.correctAnswerText, { color: colors.success }]}>
                {formatAnswer(question.correctAnswer)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/* Animated content that shows/hides */}
      <Animated.View style={animatedContentStyle}>
        <View style={[styles.accordionContent, { borderTopColor: colors.border }]}>
          <Text style={[styles.questionText, { color: colors.textPrimary }]}>{question.question}</Text>
          <View style={styles.answerSection}>
            <View style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Your Answer:</Text>
              <Text style={[styles.incorrectAnswerText, { color: colors.error }]}>
                {formatAnswer(question.userAnswer)}
              </Text>
            </View>
            <View style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Correct Answer:</Text>
              <Text style={[styles.correctAnswerText, { color: colors.success }]}>
                {formatAnswer(question.correctAnswer)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function QuizResults() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ quizIndex: string }>();
  const quizIndex = params.quizIndex ? parseInt(params.quizIndex, 10) : null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [incorrectQuestions, setIncorrectQuestions] = useState<IncorrectQuestion[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (quizIndex === null || quizIndex < 0) {
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
          router.back();
          return;
        }
        const fetchedQuiz = quizzes[quizIndex];
        setQuiz(fetchedQuiz);
        
        // Calculate incorrect questions using helper function
        const incorrect: IncorrectQuestion[] = [];
        fetchedQuiz.questionsList.forEach((question: QuizQuestion, index: number) => {
          const isCorrect = checkAnswerHelper(
            question.currentAnswer,
            question.answer,
            question.type
          );
          if (!isCorrect) {
            incorrect.push({
              ...question,
              index,
              userAnswer: question.currentAnswer,
              correctAnswer: question.answer,
            });
          }
        });
        setIncorrectQuestions(incorrect);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  };


  const formatAnswer = (answer: string | string[]): string => {
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return answer || "No answer";
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (loading || !quiz) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading results...</Text>
        </View>
      </View>
    );
  }

  const totalQuestions = quiz.questionsList.length;
  const correctCount = totalQuestions - incorrectQuestions.length;
  const incorrectCount = incorrectQuestions.length;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{quiz.title}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getTabBarPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Results</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Correct</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{correctCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Incorrect</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>{incorrectCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{totalQuestions}</Text>
            </View>
          </View>

          <View style={[styles.scoreContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Score</Text>
            <Text style={[styles.scoreValue, { color: colors.brandPrimary }]}>{quiz.score}%</Text>
          </View>
        </View>

        {incorrectQuestions.length > 0 && (
          <View style={styles.incorrectContainer}>
            <Text style={[styles.incorrectTitle, { color: colors.textPrimary }]}>Incorrect Questions</Text>
            {incorrectQuestions.map((question, idx) => {
              return (
                <AccordionItem
                  key={idx}
                  question={question}
                  isExpanded={expandedIndex === idx}
                  onToggle={() => toggleExpand(idx)}
                  formatAnswer={formatAnswer}
                />
              );
            })}
          </View>
        )}

        <View style={styles.navigationContainer}>
          <AuthenticationButton
            title="See All Questions"
            onPress={() => {
              router.push({
                pathname: "/(authenticated)/(quizFlow)/quizReview",
                params: { quizIndex: quizIndex!.toString() },
              });
            }}
          />
          <View style={styles.buttonSpacer} />
          <AuthenticationButton
            title="Return to Quiz Home"
            onPress={() => {
              router.push({
                pathname: "/(authenticated)/(quizFlow)/quizHome",
                params: { quizIndex: quizIndex!.toString() },
              });
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    height: "100%",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginTop: 70,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Inter",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryContainer: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Inter",
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter",
  },
  scoreContainer: {
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: "Inter",
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: "Inter",
  },
  incorrectContainer: {
    marginBottom: 20,
  },
  incorrectTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 15,
  },
  accordionItem: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  accordionQuestionText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  accordionContent: {
    padding: 15,
    borderTopWidth: 1,
  },
  questionText: {
    fontSize: 16,
    fontFamily: "Inter",
    marginBottom: 15,
    lineHeight: 24,
  },
  answerSection: {
    gap: 10,
  },
  answerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  incorrectAnswerText: {
    fontSize: 14,
    fontFamily: "Inter",
    flex: 1,
  },
  correctAnswerText: {
    fontSize: 14,
    fontFamily: "Inter",
    flex: 1,
  },
  navigationContainer: {
    marginTop: 20,
  },
  buttonSpacer: {
    height: 10,
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

