import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Timestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AuthenticationButton from "@/components/buttons/authenticationButton";
import { Quiz, QuizQuestion, checkAnswer } from "@/utils/quizHelpers";
import { getTabBarPadding } from '@/utils/tabBarHelpers';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animated Navigation Button Component
function AnimatedNavButton({ 
  onPress, 
  disabled = false, 
  title, 
  icon, 
  iconPosition = 'left',
  style 
}: { 
  onPress: () => void; 
  disabled?: boolean; 
  title: string;
  icon: string;
  iconPosition?: 'left' | 'right';
  style?: any;
}) {
  const { colors } = useTheme();
  const pressProgress = useSharedValue(0);
  
  const handlePressIn = useCallback(() => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pressProgress.value = withTiming(1, { duration: 100 });
    }
  }, [disabled]);
  
  const handlePressOut = useCallback(() => {
    if (!disabled) {
      pressProgress.value = withTiming(0, { duration: 100 });
      onPress();
    }
  }, [disabled, onPress]);
  
  const animatedButtonStyle = useAnimatedStyle(() => {
    const translateY = pressProgress.value * 2;
    const backgroundColor = disabled 
      ? colors.disabledBackground
      : interpolateColor(
          pressProgress.value,
          [0, 1],
          [colors.brandPrimary, colors.brandPrimaryPressed]
        );
    
    return {
      transform: [{ translateY }],
      backgroundColor,
    };
  });
  
  return (
    <AnimatedPressable 
      style={[styles.navButton, style, animatedButtonStyle, disabled && styles.navButtonDisabled]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {iconPosition === 'left' && (
        <Ionicons
          name={icon as any}
          size={24}
          color={disabled ? '#e0e0e0' : '#e0e0e0'}
          style={disabled && { opacity: 0.6 }}
        />
      )}
      <Text style={[styles.navButtonText, { color: '#e0e0e0' }, disabled && { opacity: 0.6 }]}>{title}</Text>
      {iconPosition === 'right' && (
        <Ionicons
          name={icon as any}
          size={24}
          color={disabled ? '#e0e0e0' : '#e0e0e0'}
          style={disabled && { opacity: 0.6 }}
        />
      )}
    </AnimatedPressable>
  );
}

export default function QuizReview() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ quizIndex: string; questionIndex?: string }>();
  const quizIndex = params.quizIndex ? parseInt(params.quizIndex, 10) : null;
  const initialQuestionIndex = params.questionIndex ? parseInt(params.questionIndex, 10) : 0;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  
  // Animation values for slide transitions
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const currentIndexRef = useSharedValue(initialQuestionIndex);
  const quizLengthRef = useSharedValue(0);
  const screenWidthRef = useSharedValue(screenWidth);
  
  // Update refs when state changes
  useEffect(() => {
    currentIndexRef.value = currentQuestionIndex;
    screenWidthRef.value = screenWidth;
    if (quiz) {
      quizLengthRef.value = quiz.questionsList.length;
    }
  }, [currentQuestionIndex, quiz, screenWidth]);
  
  // Animated style for sliding content
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

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
        
        // Ensure question index is valid
        if (currentQuestionIndex >= fetchedQuiz.questionsList.length) {
          setCurrentQuestionIndex(0);
        }
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionIndex = (newIndex: number) => {
    setCurrentQuestionIndex(newIndex);
  };

  const performSlideAnimation = (newIndex: number, direction: 'left' | 'right') => {
    'worklet';
    if (isAnimating.value) return;
    if (newIndex < 0 || newIndex >= quizLengthRef.value) return;

    isAnimating.value = true;
    const width = screenWidthRef.value;
    
    // Animate content sliding out
    const slideOutDistance = direction === 'left' ? -width : width;
    translateX.value = withTiming(slideOutDistance, { duration: 300 }, (finished) => {
      'worklet';
      if (finished) {
        // Update question index on JS thread
        runOnJS(updateQuestionIndex)(newIndex);
        
        // Reset position and slide new content in from opposite side
        translateX.value = direction === 'left' ? width : -width;
        translateX.value = withTiming(0, { duration: 200 }, () => {
          'worklet';
          isAnimating.value = false;
        });
      }
    });
  };

  const animateNavigation = (newIndex: number, direction: 'left' | 'right') => {
    if (!quiz) return;
    if (newIndex < 0 || newIndex >= quiz.questionsList.length) return;
    performSlideAnimation(newIndex, direction);
  };

  const handleNavigate = (newIndex: number) => {
    if (!quiz) return;
    if (newIndex < 0 || newIndex >= quiz.questionsList.length) return;
    
    // Determine direction based on index change
    const direction = newIndex > currentQuestionIndex ? 'left' : 'right';
    animateNavigation(newIndex, direction);
  };

  const formatAnswer = (answer: string | string[]): string => {
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return answer || "No answer";
  };

  const getAnswerStatus = (question: QuizQuestion): "correct" | "incorrect" | "unanswered" => {
    const userAnswer = question.currentAnswer;
    
    // Check if unanswered
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
      return "unanswered";
    }

    const isCorrect = checkAnswer(userAnswer, question.answer, question.type);
    return isCorrect ? "correct" : "incorrect";
  };

  if (loading || !quiz) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading questions...</Text>
        </View>
      </View>
    );
  }

  const currentQuestion = quiz.questionsList[currentQuestionIndex];
  const status = getAnswerStatus(currentQuestion);
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === quiz.questionsList.length - 1;

  // Configure swipe gesture with real-time animation
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (isAnimating.value) return;
      
      const { translationX } = event;
      const width = screenWidthRef.value;
      // Clamp translation to prevent over-sliding
      const clampedTranslation = Math.max(-width, Math.min(width, translationX));
      translateX.value = clampedTranslation;
    })
    .onEnd((event) => {
      'worklet';
      if (isAnimating.value) return;
      
      const { translationX, velocityX } = event;
      const swipeThreshold = 50;
      const velocityThreshold = 500;
      
      const currentIdx = currentIndexRef.value;
      const quizLength = quizLengthRef.value;
      const isFirst = currentIdx === 0;
      const isLast = currentIdx >= quizLength - 1;
      
      if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        // Swipe left = next
        if (!isLast && quizLength > 0) {
          performSlideAnimation(currentIdx + 1, 'left');
        } else {
          // Snap back if at last question
          translateX.value = withSpring(0);
        }
      } else if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        // Swipe right = previous
        if (!isFirst) {
          performSlideAnimation(currentIdx - 1, 'right');
        } else {
          // Snap back if at first question
          translateX.value = withSpring(0);
        }
      } else {
        // Snap back if swipe wasn't strong enough
        translateX.value = withSpring(0);
      }
    })
    .activeOffsetX([-10, 10]) // Only activate on horizontal movement
    .failOffsetY([-5, 5]) // Fail if vertical movement is too large
    .runOnJS(false); // Run on UI thread for smooth animation

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>{quiz.title}</Text>
        </View>

        <View style={styles.scrollContent}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.slidingContentContainer, animatedContentStyle]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.slidingScrollView}
                contentContainerStyle={styles.slidingScrollContent}
              >
                <View style={styles.questionHeader}>
                  <Text style={[styles.questionNumber, { color: colors.textPrimary }]}>
                    {currentQuestionIndex + 1}/{quiz.questionsList.length}
                  </Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: status === "correct" ? colors.success : status === "incorrect" ? colors.error : colors.textSecondary }
                  ]}>
                    <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                      {status === "correct" ? "Correct" : status === "incorrect" ? "Incorrect" : "Unanswered"}
                    </Text>
                  </View>
                </View>

                <View style={[styles.questionContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>{currentQuestion.question}</Text>
                </View>

                <View style={styles.answersContainer}>
                  <View style={styles.answerSection}>
                    <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Your Answer:</Text>
                    <View style={[
                      styles.answerBox, 
                      { 
                        backgroundColor: status === "correct" ? colors.successBackground : status === "incorrect" ? colors.errorBackground : colors.backgroundSecondary,
                        borderColor: status === "correct" ? colors.success : status === "incorrect" ? colors.error : colors.border
                      }
                    ]}>
                      <Text style={[
                        styles.answerText, 
                        { color: status === "correct" ? colors.success : status === "incorrect" ? colors.error : colors.textPrimary }
                      ]}>
                        {formatAnswer(currentQuestion.currentAnswer)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.answerSection}>
                    <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Correct Answer:</Text>
                    <View style={[styles.answerBox, { backgroundColor: colors.successBackground, borderColor: colors.success }]}>
                      <Text style={[styles.answerText, { color: colors.success }]}>
                        {formatAnswer(currentQuestion.answer)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </GestureDetector>

          <View style={styles.questionIndicator}>
            {quiz.questionsList.map((_, idx) => {
              const isActive = idx === currentQuestionIndex;
              const questionStatus = getAnswerStatus(quiz.questionsList[idx]);
              return (
                <AnimatedDot
                  key={idx}
                  isActive={isActive}
                  status={questionStatus}
                  index={idx}
                  currentIndex={currentQuestionIndex}
                />
              );
            })}
          </View>

          <View style={styles.navigationContainer}>
            <AnimatedNavButton
              onPress={() => handleNavigate(currentQuestionIndex - 1)}
              disabled={isFirstQuestion}
              title="Previous"
              icon="chevron-back"
              iconPosition="left"
            />

            <AnimatedNavButton
              onPress={() => handleNavigate(currentQuestionIndex + 1)}
              disabled={isLastQuestion}
              title="Next"
              icon="chevron-forward"
              iconPosition="right"
            />
          </View>

          <View style={[styles.returnContainer, { paddingBottom: getTabBarPadding(insets.bottom) }]}>
            <AuthenticationButton
              title="Return to Results"
              onPress={() => {
                router.push({
                  pathname: "/(authenticated)/(quizFlow)/quizResults",
                  params: { quizIndex: quizIndex!.toString() },
                });
              }}
            />
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

// Animated Dot Component
function AnimatedDot({ 
  isActive, 
  status,
  index,
  currentIndex
}: { 
  isActive: boolean; 
  status: "correct" | "incorrect" | "unanswered";
  index: number;
  currentIndex: number;
}) {
  const { colors } = useTheme();
  const dotSize = useSharedValue(isActive ? 10 : 8);
  const dotScale = useSharedValue(isActive ? 1.2 : 1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Add a subtle pulse animation when question changes to this dot
    if (isActive && index === currentIndex) {
      opacity.value = withTiming(0.6, { duration: 150 }, () => {
        opacity.value = withTiming(1, { duration: 150 });
      });
    }

    if (isActive) {
      dotSize.value = withTiming(10, { duration: 200 });
      dotScale.value = withSpring(1.2, { damping: 15, stiffness: 200 });
    } else {
      dotSize.value = withTiming(8, { duration: 200 });
      dotScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  }, [isActive, currentIndex]);

  const getBackgroundColor = () => {
    if (isActive) return colors.brandPrimary;
    if (status === "correct") return colors.success;
    if (status === "incorrect") return colors.error;
    return colors.border;
  };

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      width: dotSize.value,
      height: dotSize.value,
      borderRadius: dotSize.value / 2,
      transform: [{ scale: dotScale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.indicatorDotBase, 
        animatedDotStyle,
        { backgroundColor: getBackgroundColor() }
      ]} 
    />
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  slidingContentContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  slidingScrollView: {
    flex: 1,
  },
  slidingScrollContent: {
    paddingBottom: 20,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  questionContainer: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 20,
    fontFamily: "Inter",
    lineHeight: 28,
  },
  answersContainer: {
    marginBottom: 30,
    gap: 15,
  },
  answerSection: {
    marginBottom: 15,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter",
    marginBottom: 8,
  },
  answerBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  answerText: {
    fontSize: 16,
    fontFamily: "Inter",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  questionIndicator: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  indicatorDotBase: {
    // Base styles are handled by animation
  },
  returnContainer: {
    marginTop: 20,
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

