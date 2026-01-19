import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QuizProgressBar from "@/components/quizProgressBar";
import FlashcardFlipCard from "@/components/flashcardFlipCard";
import {
  updateCardConfidence,
} from "@/utils/flashcardHelpers";
import { FlashcardSet as FlashcardSetType, Flashcard as FlashcardType, SessionResult } from "@/types";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function FlashcardQuestion() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    flashcardIndex: string;
    numberOfCards?: string;
  }>();
  const flashcardIndex = params.flashcardIndex
    ? parseInt(params.flashcardIndex, 10)
    : null;
  const requestedNumberOfCards = params.numberOfCards
    ? parseInt(params.numberOfCards, 10)
    : 10;

  const [flashcard, setFlashcard] = useState<FlashcardSetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [animating, setAnimating] = useState(false);
  const [cardsToStudy, setCardsToStudy] = useState<FlashcardType[]>([]);
  const [originalIndices, setOriginalIndices] = useState<number[]>([]);

  const cardOpacity = useSharedValue(1);
  const cardTranslateX = useSharedValue(0);
  const cardTranslateY = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const glowColor = useSharedValue(0);

  useEffect(() => {
    if (flashcardIndex === null || flashcardIndex < 0) {
      Alert.alert("Error", "Invalid flashcard index");
      router.back();
      return;
    }
    fetchFlashcard();
  }, [userId, flashcardIndex]);

  const fetchFlashcard = async () => {
    if (!userId || !db || flashcardIndex === null) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const flashcards = userData.history?.flashcards || [];
        if (flashcardIndex >= flashcards.length) {
          Alert.alert("Error", "Flashcard set not found");
          router.back();
          return;
        }
        const fetchedFlashcard = flashcards[flashcardIndex];
        setFlashcard(fetchedFlashcard);

        // Filter out mastered cards (confidenceLevel === 5)
        const nonMasteredCards = fetchedFlashcard.cards
          .map((card: FlashcardType, index: number) => ({ card, originalIndex: index }))
          .filter(({ card }: { card: FlashcardType; originalIndex: number }) => card.confidenceLevel !== 5);

        if (nonMasteredCards.length === 0) {
          Alert.alert(
            "All Cards Mastered!",
            "Congratulations! You have mastered all cards in this set.",
            [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]
          );
          setLoading(false);
          return;
        }

        // Shuffle the non-mastered cards randomly
        const shuffled = [...nonMasteredCards];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Limit to requested number (but not more than available)
        // Edge case: if only 4 cards left to master and user wants 10, show only 4
        const maxCards = Math.min(requestedNumberOfCards, shuffled.length);
        const selectedCards = shuffled.slice(0, maxCards);

        // Extract cards and their original indices
        const cards = selectedCards.map(({ card }) => card);
        const indices = selectedCards.map(({ originalIndex }) => originalIndex);

        setCardsToStudy(cards);
        setOriginalIndices(indices);
        setCurrentCardIndex(0);
      }
    } catch (error) {
      console.error("Error fetching flashcard:", error);
      Alert.alert("Error", "Failed to load flashcard set");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (animating || selectedAnswer !== null) return;
    if (!flashcard || cardsToStudy.length === 0) return;

    setSelectedAnswer(isCorrect);
    setAnimating(true);

    const currentCard = cardsToStudy[currentCardIndex];
    const previousConfidence = currentCard.confidenceLevel;
    const newConfidence = updateCardConfidence(
      previousConfidence,
      isCorrect
    );

    // Add to session results with original index
    const originalIndex = originalIndices[currentCardIndex];
    const result: SessionResult = {
      cardIndex: originalIndex,
      wasCorrect: isCorrect,
      previousConfidence,
      newConfidence,
    };
    const updatedResults = [...sessionResults, result];
    setSessionResults(updatedResults);

    // Update glow color first (border color change happens via selectedAnswer state)
    if (isCorrect) {
      glowColor.value = withTiming(1, { duration: 400 });
    } else {
      // For incorrect, we can add a red glow if desired
      glowColor.value = withTiming(1, { duration: 400 });
    }

    // Wait for border color and glow to change, then slide away
    setTimeout(() => {
      // Animate card exit after border color has changed
      if (isCorrect) {
        // Slide right and fade out for correct
        cardTranslateX.value = withTiming(500, { duration: 400 });
        cardOpacity.value = withTiming(0, { duration: 400 });
      } else {
        // Slide left and fade out for incorrect
        cardTranslateX.value = withTiming(-500, { duration: 400 });
        cardOpacity.value = withTiming(0, { duration: 400 });
      }

      // Wait for slide animation, then show next card
      setTimeout(() => {
        moveToNextCard(newConfidence, updatedResults);
      }, 500);
    }, 300); // Wait 300ms for border color change
  };

  const moveToNextCard = (newConfidence: number, updatedSessionResults: SessionResult[]) => {
    if (currentCardIndex < cardsToStudy.length - 1) {
      // Update the card in the array
      const updatedCards = [...cardsToStudy];
      updatedCards[currentCardIndex] = {
        ...updatedCards[currentCardIndex],
        confidenceLevel: newConfidence,
        status: newConfidence === 5 ? "complete" : "review",
      };
      setCardsToStudy(updatedCards);

      // Move to next card
      setCurrentCardIndex(currentCardIndex + 1);
      setFlipped(false); // Ensure new card starts with question side showing
      setSelectedAnswer(null);
      glowColor.value = 0;

      // Reset animation values
      cardOpacity.value = 0;
      cardTranslateX.value = 0;
      cardTranslateY.value = -50;
      cardScale.value = 0.9;

      // Animate card entrance (fade in and slide down from top)
      cardOpacity.value = withTiming(1, { duration: 400 });
      cardTranslateY.value = withTiming(0, { duration: 400 });
      cardScale.value = withTiming(1, { duration: 400 });

      setTimeout(() => {
        setAnimating(false);
      }, 400);
    } else {
      // All cards done, save and navigate to results
      finishSession(newConfidence, updatedSessionResults);
    }
  };

  const finishSession = async (lastConfidence: number, updatedSessionResults: SessionResult[]) => {
    if (!flashcard || !userId || !db || flashcardIndex === null) return;

    try {
      // Update flashcard in Firestore
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Alert.alert("Error", "User not found");
        return;
      }

      const userData = userDoc.data();
      const flashcards = userData.history?.flashcards || [];
      const updatedFlashcard = { ...flashcards[flashcardIndex] };

      // Update cards with new confidence levels from session results
      updatedSessionResults.forEach((result) => {
        if (result.cardIndex < updatedFlashcard.cards.length) {
          const cardToUpdate = updatedFlashcard.cards[result.cardIndex];
          cardToUpdate.confidenceLevel = result.newConfidence;
          cardToUpdate.status = result.newConfidence === 5 ? "complete" : "review";
        }
      });

      // Update lastReviewed timestamp
      updatedFlashcard.lastReviewed = Timestamp.fromDate(new Date()) as any;

      const newFlashcards = [...flashcards];
      newFlashcards[flashcardIndex] = updatedFlashcard;

      await updateDoc(userRef, {
        "history.flashcards": newFlashcards,
      });

      // Navigate to results
      router.push({
        pathname: "/(authenticated)/(flashcardFlow)/flashcardResults",
        params: {
          flashcardIndex: flashcardIndex.toString(),
          sessionResults: JSON.stringify(updatedSessionResults),
        },
      });
    } catch (error) {
      console.error("Error finishing session:", error);
      Alert.alert("Error", "Failed to save session results");
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: cardTranslateX.value },
        { translateY: cardTranslateY.value },
        { scale: cardScale.value },
      ],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    const shadowColor = selectedAnswer === true 
      ? colors.success 
      : selectedAnswer === false 
      ? colors.error 
      : "transparent";
    const shadowOpacity = glowColor.value * 0.8;
    return {
      shadowColor,
      shadowOpacity,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: glowColor.value * 10,
    };
  });

  // Determine border color based on selected answer
  const getBorderColor = () => {
    if (selectedAnswer === true) return colors.success; // Green for correct
    if (selectedAnswer === false) return colors.error; // Red for incorrect
    return colors.brandPrimary; // Blue default
  };

  if (loading || !flashcard || cardsToStudy.length === 0) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading flashcard...</Text>
        </View>
      </View>
    );
  }

  const currentCard = cardsToStudy[currentCardIndex];

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{flashcard.title}</Text>
      </View>

      <View style={styles.contentContainer}>
        <QuizProgressBar
          current={currentCardIndex + 1}
          total={cardsToStudy.length}
        />

        <Animated.View
          style={[styles.cardWrapper, cardAnimatedStyle, glowAnimatedStyle]}
        >
            <FlashcardFlipCard
                key={currentCardIndex}
                question={currentCard.question}
                answer={currentCard.answer}
                flipped={flipped}
                onFlip={handleFlip}
                borderColor={getBorderColor()}
            />
          
        </Animated.View>

        {flipped && (
          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={[
                styles.actionButton,
                styles.incorrectButton,
                { borderColor: colors.error },
                selectedAnswer === false && { backgroundColor: colors.error, borderColor: colors.error },
                (animating || selectedAnswer !== null) && styles.buttonDisabled,
              ]}
              onPress={() => handleAnswer(false)}
              disabled={animating || selectedAnswer !== null}
            >
              <Ionicons
                name="close"
                size={28}
                color={selectedAnswer === false ? colors.textPrimary : colors.error}
              />
            </Pressable>

            <Pressable
              style={[
                styles.actionButton,
                styles.correctButton,
                { borderColor: colors.success },
                selectedAnswer === true && { backgroundColor: colors.success, borderColor: colors.success },
                (animating || selectedAnswer !== null) && styles.buttonDisabled,
              ]}
              onPress={() => handleAnswer(true)}
              disabled={animating || selectedAnswer !== null}
            >
              <Ionicons
                name="checkmark"
                size={28}
                color={selectedAnswer === true ? colors.textPrimary : colors.success}
              />
            </Pressable>
          </View>
        )}

        {!flipped && (
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>Tap the card to reveal the answer</Text>
        )}
      </View>
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
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Inter",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    marginBottom: 30,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 20,
    gap: 20,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  incorrectButton: {
    backgroundColor: "transparent",
  },
  incorrectButtonActive: {
  },
  correctButton: {
    backgroundColor: "transparent",
  },
  correctButtonActive: {
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  hintText: {
    fontSize: 16,
    fontFamily: "Inter",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
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

