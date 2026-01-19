import { View, Text, StyleSheet, ActivityIndicator, Alert, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import QuizProgressBar from "@/components/quizProgressBar";
import MultipleChoiceOption from "@/components/questionTypes/multipleChoiceOption";
import MultipleSelectionOption from "@/components/questionTypes/multipleSelectionOption";
import FillInBlankInput from "@/components/questionTypes/fillInBlankInput";
import AuthenticationButton from "@/components/buttons/authenticationButton";
import { Quiz, QuizQuestion as QuizQuestionType, calculateQuizScore } from "@/utils/quizHelpers";
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
      style={[styles.navButton, styles.navButtonEqual, style, animatedButtonStyle, disabled && styles.navButtonDisabled]}
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

export default function QuizQuestion() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ quizIndex: string; questionIndex: string }>();
  const quizIndex = params.quizIndex ? parseInt(params.quizIndex, 10) : null;
  const initialQuestionIndex = params.questionIndex ? parseInt(params.questionIndex, 10) : 0;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  
  // Animated style for sliding content (must be called before any conditional returns)
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Submit button fade-in animation (must be called before any conditional returns)
  const submitOpacity = useSharedValue(0);
  
  const submitButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: submitOpacity.value,
    };
  });

  useEffect(() => {
    if (quizIndex === null || initialQuestionIndex < 0) {
      Alert.alert("Error", "Invalid quiz or question index");
      router.back();
      return;
    }
    // Initialize currentQuestionIndex from params
    setCurrentQuestionIndex(initialQuestionIndex);
    fetchQuiz();
  }, [userId, quizIndex]);

  // Update submit button opacity based on current question index
  useEffect(() => {
    if (quiz && quiz.questionsList.length > 0) {
      const isLast = currentQuestionIndex === quiz.questionsList.length - 1;
      submitOpacity.value = withTiming(isLast ? 1 : 0, { duration: 300 });
    }
  }, [currentQuestionIndex, quiz]);

  // Shuffle options for a single question using Fisher-Yates algorithm
  const shuffleOptions = (options: string[]): string[] => {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

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
        const fetchedQuiz = quizzes[quizIndex];
        // Validate question index
        if (initialQuestionIndex >= fetchedQuiz.questionsList.length || initialQuestionIndex < 0) {
          Alert.alert("Error", "Question not found");
          router.back();
          return;
        }
        
        // Shuffle options for all multiple-choice and multiple-selection questions
        // This ensures options are randomized once when quiz loads, not on every render
        const quizWithShuffledOptions = {
          ...fetchedQuiz,
          questionsList: fetchedQuiz.questionsList.map((question: QuizQuestionType) => {
            if (question.type === "multiple-choice" || question.type === "multiple-selection") {
              return {
                ...question,
                options: shuffleOptions(question.options),
              };
            }
            return question;
          }),
        };
        
        setQuiz(quizWithShuffledOptions);
        // Ensure currentQuestionIndex is set correctly
        setCurrentQuestionIndex(initialQuestionIndex);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      Alert.alert("Error", "Failed to load quiz");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveAnswerToFirestore = async (updatedQuiz: Quiz) => {
    if (!userId || !db || quizIndex === null) return;

    try {
      setSaving(true);
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      const quizzes = userData.history?.quizzes || [];
      const newQuizzes = [...quizzes];
      
      // Update the quiz with lastQuestionIndex and lastAccessed BEFORE adding to array
      // Ensure bookmarkedQuestions exists (defensive check for legacy data)
      const quizToSave: Quiz = {
        ...updatedQuiz,
        lastQuestionIndex: currentQuestionIndex,
        lastAccessed: Timestamp.now(),
        bookmarkedQuestions: updatedQuiz.bookmarkedQuestions || [],
      };
      
      newQuizzes[quizIndex] = quizToSave;

      // Update entire array at once - do NOT use dot notation on array elements
      await updateDoc(userRef, {
        "history.quizzes": newQuizzes,
      });

      setQuiz(quizToSave);
    } catch (error) {
      console.error("Error saving answer:", error);
      Alert.alert("Error", "Failed to save answer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (newAnswer: string | string[]) => {
    if (!quiz) return;

    const updatedQuiz = { ...quiz };
    updatedQuiz.questionsList = [...quiz.questionsList];
    updatedQuiz.questionsList[currentQuestionIndex] = {
      ...quiz.questionsList[currentQuestionIndex],
      currentAnswer: newAnswer,
    };

    setQuiz(updatedQuiz);
    saveAnswerToFirestore(updatedQuiz);
  };

  const handleMultipleChoiceSelect = (option: string) => {
    handleAnswerChange(option);
  };

  const handleMultipleSelectionToggle = (option: string) => {
    if (!quiz) return;

    const currentAnswer = quiz.questionsList[currentQuestionIndex].currentAnswer;
    const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];

    const newArray = currentArray.includes(option)
      ? currentArray.filter((item) => item !== option)
      : [...currentArray, option];

    handleAnswerChange(newArray);
  };

  const handleFillInBlankChange = (text: string) => {
    handleAnswerChange(text);
  };

  const saveNavigationToFirestore = async (newQuestionIndex: number) => {
    if (!quiz || !userId || !db || quizIndex === null) return;

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      const quizzes = userData.history?.quizzes || [];
      const newQuizzes = [...quizzes];
      
      // Update the quiz with lastQuestionIndex and lastAccessed
      const updatedQuiz: Quiz = {
        ...quiz,
        lastQuestionIndex: newQuestionIndex,
        lastAccessed: Timestamp.now(),
        bookmarkedQuestions: quiz.bookmarkedQuestions || [],
      };
      
      newQuizzes[quizIndex] = updatedQuiz;

      // Update entire array at once - do NOT use dot notation on array elements
      await updateDoc(userRef, {
        "history.quizzes": newQuizzes,
      });

      // Update local state to reflect Firestore changes
      setQuiz(updatedQuiz);
    } catch (error) {
      console.error("Error saving navigation to Firestore:", error);
      // Don't show alert for navigation saves - it's non-critical
    }
  };

  const updateQuestionIndex = (newIndex: number) => {
    setCurrentQuestionIndex(newIndex);
    router.setParams({ questionIndex: newIndex.toString() });
    saveNavigationToFirestore(newIndex);
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

  const handleNavigateImmediate = (newIndex: number) => {
    if (!quiz) return;
    if (newIndex < 0 || newIndex >= quiz.questionsList.length) return;
    
    // Determine direction based on index change
    const direction = newIndex > currentQuestionIndex ? 'left' : 'right';
    animateNavigation(newIndex, direction);
  };

  const toggleBookmark = async () => {
    if (!quiz || !userId || !db || quizIndex === null) return;

    try {
      setSaving(true);
      const userRef = doc(db, "users", userId);
      const bookmarkedQuestions = quiz.bookmarkedQuestions || []; // Ensure it exists (defensive check for legacy data)
      const newBookmarks = bookmarkedQuestions.includes(currentQuestionIndex)
        ? bookmarkedQuestions.filter((idx) => idx !== currentQuestionIndex)
        : [...bookmarkedQuestions, currentQuestionIndex];

      const updatedQuiz = { ...quiz, bookmarkedQuestions: newBookmarks };
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const quizzes = userData.history?.quizzes || [];
      const newQuizzes = [...quizzes];
      newQuizzes[quizIndex] = updatedQuiz;

      await updateDoc(userRef, {
        "history.quizzes": newQuizzes,
      });

      setQuiz(updatedQuiz);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to update bookmark");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!quiz) return;

    const unansweredCount = quiz.questionsList.filter((q, idx) => {
      if (Array.isArray(q.currentAnswer)) {
        return q.currentAnswer.length === 0;
      }
      return !q.currentAnswer || q.currentAnswer.trim() === "";
    }).length;

    if (unansweredCount > 0) {
      Alert.alert(
        "Unanswered Questions",
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit",
            style: "destructive",
            onPress: () => submitQuiz(),
          },
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!quiz || !userId || !db || quizIndex === null) return;

    try {
      setSaving(true);
      const score = calculateQuizScore(quiz);

      const updatedQuiz: Quiz = {
        ...quiz,
        isComplete: true,
        score: score,
        lastQuestionIndex: quiz.questionsList.length - 1,
        lastAccessed: Timestamp.now(),
        bookmarkedQuestions: quiz.bookmarkedQuestions || [], // Ensure it exists (defensive check for legacy data)
      };

      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Alert.alert("Error", "User not found");
        return;
      }

      const userData = userDoc.data();
      const quizzes = userData.history?.quizzes || [];
      const newQuizzes = [...quizzes];
      newQuizzes[quizIndex] = updatedQuiz;

      await updateDoc(userRef, {
        "history.quizzes": newQuizzes,
      });

      // Navigate to results
      router.push({
        pathname: "/(authenticated)/(quizFlow)/quizResults",
        params: { quizIndex: quizIndex.toString() },
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      Alert.alert("Error", "Failed to submit quiz");
    } finally {
      setSaving(false);
    }
  };


  if (loading || !quiz) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading question...</Text>
        </View>
      </View>
    );
  }

  // Validate currentQuestionIndex
  if (currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questionsList.length) {
    Alert.alert("Error", "Invalid question index");
    router.back();
    return null;
  }

  const currentQuestion = quiz.questionsList[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === quiz.questionsList.length - 1;
  const isBookmarked = quiz.bookmarkedQuestions.includes(currentQuestionIndex);

  // Configure swipe gesture with real-time animation
  // Use shared values to safely access state from UI thread
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
          <QuizProgressBar current={currentQuestionIndex + 1} total={quiz.questionsList.length} />

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.slidingContentContainer, animatedContentStyle]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.slidingScrollView}
                contentContainerStyle={styles.slidingScrollContent}
              >
                <View style={[styles.questionContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>{currentQuestion.question}</Text>
                </View>

                <View style={styles.answersContainer}>
                  {currentQuestion.type === "multiple-choice" && (
                    <>
                      {currentQuestion.options.map((option, idx) => (
                        <MultipleChoiceOption
                          key={idx}
                          option={option}
                          isSelected={currentQuestion.currentAnswer === option}
                          onSelect={() => handleMultipleChoiceSelect(option)}
                        />
                      ))}
                    </>
                  )}

                  {currentQuestion.type === "multiple-selection" && (
                    <>
                      {currentQuestion.options.map((option, idx) => {
                        const currentArray = Array.isArray(currentQuestion.currentAnswer)
                          ? currentQuestion.currentAnswer
                          : [];
                        return (
                          <MultipleSelectionOption
                            key={idx}
                            option={option}
                            isSelected={currentArray.includes(option)}
                            onToggle={() => handleMultipleSelectionToggle(option)}
                          />
                        );
                      })}
                    </>
                  )}

                  {currentQuestion.type === "fill-in-the-blank" && (
                    <FillInBlankInput
                      value={typeof currentQuestion.currentAnswer === "string" ? currentQuestion.currentAnswer : ""}
                      onChangeText={handleFillInBlankChange}
                    />
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </GestureDetector>

          <View style={styles.navigationContainer}>
            <AnimatedNavButton
              onPress={() => handleNavigateImmediate(currentQuestionIndex - 1)}
              disabled={isFirstQuestion}
              title="Previous"
              icon="chevron-back"
              iconPosition="left"
            />

            <Pressable
              style={[styles.bookmarkButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={toggleBookmark}
              disabled={saving}
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={24}
                color={isBookmarked ? colors.brandPrimary : colors.textSecondary}
              />
            </Pressable>

            {isLastQuestion ? (
              <AnimatedNavButton
                onPress={() => {}}
                disabled={true}
                title="Next"
                icon="chevron-forward"
                iconPosition="right"
              />
            ) : (
              <AnimatedNavButton
                onPress={() => handleNavigateImmediate(currentQuestionIndex + 1)}
                disabled={false}
                title="Next"
                icon="chevron-forward"
                iconPosition="right"
              />
            )}
          </View>

          <Animated.View style={[styles.submitContainer, submitButtonAnimatedStyle]}>
            {isLastQuestion && (
              <AuthenticationButton
                title={saving ? "Submitting..." : "Submit"}
                onPress={handleSubmit}
                disabled={saving}
              />
            )}
          </Animated.View>
          <View style={{ paddingBottom: getTabBarPadding(insets.bottom) }} />
        </View>
      </View>
    </GestureHandlerRootView>
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
    marginBottom: 10,
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
    justifyContent: 'space-between',
  },
  slidingContentContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    minHeight: 0,
  },
  slidingScrollView: {
    flex: 1,
  },
  slidingScrollContent: {
    paddingBottom: 10,
  },
  questionContainer: {
    borderWidth: 1,
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
    marginBottom: 20,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 5,
    gap: 10,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  navButtonEqual: {
    flex: 1,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  bookmarkButton: {
    padding: 12,
    borderRadius: 10,
  },
  submitContainer: {
    marginTop: 5,
    marginBottom: 5,
    width: "100%",
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
