import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthenticationButton from "@/components/buttons/authenticationButton";
import {
  calculateMasteryPercentage,
  calculateSessionStats,
  SessionResult,
} from "@/utils/flashcardHelpers";
import { FlashcardSet as FlashcardSetType } from "@/types";
import { getTabBarPadding } from "@/utils/tabBarHelpers";

export default function FlashcardResults() {
  const { db, userId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    flashcardIndex: string;
    sessionResults?: string;
  }>();
  const flashcardIndex = params.flashcardIndex
    ? parseInt(params.flashcardIndex, 10)
    : null;

  const [flashcard, setFlashcard] = useState<FlashcardSetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    know: 0,
    learning: 0,
    accuracy: 0,
  });
  const [isFullyMastered, setIsFullyMastered] = useState(false);

  useEffect(() => {
    if (flashcardIndex === null || flashcardIndex < 0) {
      router.back();
      return;
    }
    fetchFlashcard();
  }, [userId, flashcardIndex]);

  useEffect(() => {
    if (params.sessionResults) {
      try {
        const results: SessionResult[] = JSON.parse(params.sessionResults);
        const stats = calculateSessionStats(results);
        setSessionStats(stats);
      } catch (error) {
        console.error("Error parsing session results:", error);
      }
    }
  }, [params.sessionResults]);

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
          router.back();
          return;
        }
        const fetchedFlashcard = flashcards[flashcardIndex];
        setFlashcard(fetchedFlashcard);

        // Check if fully mastered
        const masteryPercentage = calculateMasteryPercentage(fetchedFlashcard);
        setIsFullyMastered(masteryPercentage === 100);
      }
    } catch (error) {
      console.error("Error fetching flashcard:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !flashcard) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading results...</Text>
        </View>
      </View>
    );
  }

  const masteryPercentage = calculateMasteryPercentage(flashcard);
  const totalCards = flashcard.cards.length;
  const masteredCount = flashcard.cards.filter(
    (card) => card.confidenceLevel === 5
  ).length;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{flashcard.title}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getTabBarPadding(insets.bottom) }]}
      >
        {isFullyMastered && (
          <View style={[styles.congratulationsContainer, { backgroundColor: colors.successBackground, borderColor: colors.success }]}>
            <Ionicons name="trophy" size={64} color={colors.success} />
            <Text style={[styles.congratulationsTitle, { color: colors.success }]}>Congratulations!</Text>
            <Text style={[styles.congratulationsText, { color: colors.textPrimary }]}>
              You've mastered all {totalCards} flashcards!
            </Text>
          </View>
        )}

        <View style={[styles.summaryContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Results</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Know</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {sessionStats.know}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Learning</Text>
              <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                {sessionStats.learning}
              </Text>
            </View>
          </View>

          <View style={[styles.scoreContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Accuracy</Text>
            <Text style={[styles.scoreValue, { color: colors.brandPrimary }]}>{sessionStats.accuracy}%</Text>
          </View>

          <View style={[styles.masteryContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.masteryLabel, { color: colors.textSecondary }]}>Overall Mastery</Text>
            <View style={[styles.masteryBarContainer, { backgroundColor: colors.backgroundTertiary }]}>
              <View
                style={[
                  styles.masteryBar,
                  { width: `${masteryPercentage}%`, backgroundColor: colors.success },
                ]}
              />
            </View>
            <Text style={[styles.masteryValue, { color: colors.textPrimary }]}>
              {masteredCount} / {totalCards} cards mastered ({masteryPercentage}%)
            </Text>
          </View>
        </View>

        <View style={styles.navigationContainer}>
          {!isFullyMastered && (
            <>
              <AuthenticationButton
                title="Resume Flashcards"
                onPress={() => {
                  router.push({
                    pathname: "/(authenticated)/(flashcardFlow)/flashcardQuestion",
                    params: {
                      flashcardIndex: flashcardIndex!.toString(),
                      numberOfCards: "10",
                    },
                  });
                }}
              />
              <View style={styles.buttonSpacer} />
            </>
          )}
          <AuthenticationButton
            title="Flashcard Home"
            onPress={() => {
              router.push({
                pathname: "/(authenticated)/(flashcardFlow)/flashcardHome",
                params: { flashcardIndex: flashcardIndex!.toString() },
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
    backgroundColor: "#121212",
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
    color: "#e0e0e0",
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
  congratulationsContainer: {
    padding: 30,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 2,
  },
  congratulationsTitle: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginTop: 15,
    marginBottom: 10,
  },
  congratulationsText: {
    fontSize: 18,
    fontFamily: "Inter",
    textAlign: "center",
  },
  summaryContainer: {
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
  correctText: {
  },
  learningText: {
  },
  scoreContainer: {
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    marginBottom: 15,
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
  masteryContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
  },
  masteryLabel: {
    fontSize: 16,
    fontFamily: "Inter",
    marginBottom: 10,
  },
  masteryBarContainer: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  masteryBar: {
    height: "100%",
    borderRadius: 6,
  },
  masteryValue: {
    fontSize: 14,
    fontFamily: "Inter",
    textAlign: "center",
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

