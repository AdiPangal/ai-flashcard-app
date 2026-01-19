import {View, Text, StyleSheet, Alert, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import AuthenticationButton from "@/components/buttons/authenticationButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Timestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import MultilineInput from "@/components/userInput/multilineInput";
import NumericalInput from "@/components/userInput/numericalInput";
import Animated , {useAnimatedStyle, withTiming, useSharedValue} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchBar from "@/components/userInput/searchBar";
import FilterButton from "@/components/buttons/filterButton";
import { getTabBarPadding } from "@/utils/tabBarHelpers";
import {calculateMasteryPercentage,getCardStatus,filterCards,sortCards,searchCards,} from "@/utils/flashcardHelpers";
import { FlashcardSet as FlashcardSetType, Flashcard as FlashcardType, FilterOptions, SortOption } from "@/types";
import FlashcardConfidenceIndicator from "@/components/flashcardConfidenceIndicator";
import ProcessingLoader from "@/components/processingLoader";
import SecondaryButton from "@/components/buttons/secondaryButton";

interface FlashcardAccordionItemProps {
  card: FlashcardType;
  cardKey: number;
  isExpanded: boolean;
  onToggle: (key: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  originalIndex: number;
}

function FlashcardAccordionItem({
  card,
  cardKey,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  originalIndex,
}: FlashcardAccordionItemProps) {
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      overflow: 'hidden',
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

  const status = getCardStatus(card.confidenceLevel);

  return (
    <View style={[styles.accordionItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <Pressable
        style={styles.accordionHeader}
        onPress={() => onToggle(cardKey)}
      >
        <View style={styles.accordionHeaderLeft}>
          <Text style={[styles.accordionQuestionText, { color: colors.textPrimary }]} numberOfLines={1}>
            {card.question}
          </Text>
          <FlashcardConfidenceIndicator
            confidenceLevel={card.confidenceLevel}
          />
        </View>
        <View style={styles.accordionHeaderRight}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (originalIndex >= 0) {
                Alert.alert(
                  "Card Actions",
                  "Choose an action",
                  [
                    {
                      text: "Edit",
                      onPress: () => onEdit(originalIndex),
                    },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => onDelete(originalIndex),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
              }
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </Pressable>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textPrimary}
          />
        </View>
      </Pressable>
      {/* Hidden measurement view - always rendered to get height */}
      <View style={{ position: 'absolute', opacity: 0, zIndex: -1 }} pointerEvents="none">
        <View 
          style={[styles.accordionContent, { borderTopColor: colors.border }]} 
          onLayout={handleContentLayout}
        >
          <View style={styles.cardContent}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Question:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{card.question}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Answer:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{card.answer}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Status:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{status}</Text>
          </View>
        </View>
      </View>
      {/* Animated content that shows/hides */}
      <Animated.View style={animatedStyle}>
        <View style={[styles.accordionContent, { borderTopColor: colors.border }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Question:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{card.question}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Answer:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{card.answer}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Status:</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]}>{status}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function FlashcardHome() {
  const { db, userId } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ flashcardIndex: string }>();
  const flashcardIndex = params.flashcardIndex
    ? parseInt(params.flashcardIndex, 10)
    : null;

  const [flashcard, setFlashcard] = useState<FlashcardSetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [numberOfCards, setNumberOfCards] = useState<string>("10");
  const [newCardQuestion, setNewCardQuestion] = useState("");
  const [newCardAnswer, setNewCardAnswer] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    mastered: false,
    learned: false,
    unlearned: false,
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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
        // numberOfCards is stored locally, default to 10 or all cards if less
        if (fetchedFlashcard.cards.length > 0) {
          setNumberOfCards(
            Math.min(10, fetchedFlashcard.cards.length).toString()
          );
        }
      }
    } catch (error) {
      console.error("Error fetching flashcard:", error);
      Alert.alert("Error", "Failed to load flashcard set");
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

  const toggleCardExpansion = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const handleResetProgress = async () => {
    if (!flashcard || !userId || !db || flashcardIndex === null) return;

    Alert.alert(
      "Reset Progress",
      "This will reset all cards to confidence level 0. Are you sure?",
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
              const flashcards = userData.history?.flashcards || [];
              const updatedFlashcard = { ...flashcards[flashcardIndex] };

              // Reset all cards to confidence level 0
              updatedFlashcard.cards = updatedFlashcard.cards.map(
                (card: FlashcardType) => ({
                  ...card,
                  confidenceLevel: 0,
                  status: "review",
                })
              );

              // Update Firestore
              const newFlashcards = [...flashcards];
              newFlashcards[flashcardIndex] = updatedFlashcard;

              await updateDoc(userRef, {
                "history.flashcards": newFlashcards,
              });

              setFlashcard(updatedFlashcard);
              Alert.alert("Success", "Progress reset successfully");
            } catch (error) {
              console.error("Error resetting progress:", error);
              Alert.alert("Error", "Failed to reset progress");
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleAddCard = async () => {
    if (!flashcard || !userId || !db || flashcardIndex === null) return;
    if (!newCardQuestion.trim() || !newCardAnswer.trim()) {
      Alert.alert("Error", "Please fill in both question and answer");
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Alert.alert("Error", "User not found");
        return;
      }

      const userData = userDoc.data();
      const flashcards = userData.history?.flashcards || [];
      const updatedFlashcard = { ...flashcards[flashcardIndex] };

      const newCard: FlashcardType = {
        question: newCardQuestion.trim(),
        answer: newCardAnswer.trim(),
        status: "review",
        confidenceLevel: 0,
      };

      updatedFlashcard.cards = [...updatedFlashcard.cards, newCard];

      const newFlashcards = [...flashcards];
      newFlashcards[flashcardIndex] = updatedFlashcard;

      await updateDoc(userRef, {
        "history.flashcards": newFlashcards,
      });

      setFlashcard(updatedFlashcard);
      setNewCardQuestion("");
      setNewCardAnswer("");
      setShowAddModal(false);
      Alert.alert("Success", "Card added successfully");
    } catch (error) {
      console.error("Error adding card:", error);
      Alert.alert("Error", "Failed to add card");
    }
  };

  const handleEditCard = async () => {
    if (
      !flashcard ||
      !userId ||
      !db ||
      flashcardIndex === null ||
      editingCardIndex === null
    )
      return;
    if (!newCardQuestion.trim() || !newCardAnswer.trim()) {
      Alert.alert("Error", "Please fill in both question and answer");
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Alert.alert("Error", "User not found");
        return;
      }

      const userData = userDoc.data();
      const flashcards = userData.history?.flashcards || [];
      const updatedFlashcard = { ...flashcards[flashcardIndex] };

      updatedFlashcard.cards[editingCardIndex] = {
        ...updatedFlashcard.cards[editingCardIndex],
        question: newCardQuestion.trim(),
        answer: newCardAnswer.trim(),
      };

      const newFlashcards = [...flashcards];
      newFlashcards[flashcardIndex] = updatedFlashcard;

      await updateDoc(userRef, {
        "history.flashcards": newFlashcards,
      });

      setFlashcard(updatedFlashcard);
      setNewCardQuestion("");
      setNewCardAnswer("");
      setEditingCardIndex(null);
      setShowEditModal(false);
      Alert.alert("Success", "Card updated successfully");
    } catch (error) {
      console.error("Error editing card:", error);
      Alert.alert("Error", "Failed to update card");
    }
  };

  const handleDeleteCard = async (index: number) => {
    if (!flashcard || !userId || !db || flashcardIndex === null) return;

    Alert.alert(
      "Delete Card",
      "Are you sure you want to delete this card?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", userId);
              const userDoc = await getDoc(userRef);

              if (!userDoc.exists()) {
                Alert.alert("Error", "User not found");
                return;
              }

              const userData = userDoc.data();
              const flashcards = userData.history?.flashcards || [];
              const updatedFlashcard = { ...flashcards[flashcardIndex] };

              updatedFlashcard.cards = updatedFlashcard.cards.filter(
                (_: FlashcardType, i: number) => i !== index
              );

              const newFlashcards = [...flashcards];
              newFlashcards[flashcardIndex] = updatedFlashcard;

              await updateDoc(userRef, {
                "history.flashcards": newFlashcards,
              });

              setFlashcard(updatedFlashcard);
              const newExpanded = new Set(expandedCards);
              newExpanded.delete(index);
              setExpandedCards(newExpanded);
            } catch (error) {
              console.error("Error deleting card:", error);
              Alert.alert("Error", "Failed to delete card");
            }
          },
        },
      ]
    );
  };

  const openEditModal = (index: number) => {
    if (!flashcard) return;
    setEditingCardIndex(index);
    setNewCardQuestion(flashcard.cards[index].question);
    setNewCardAnswer(flashcard.cards[index].answer);
    setShowEditModal(true);
  };

  const handleStartFlashcards = () => {
    if (!flashcard || flashcard.cards.length === 0) {
      Alert.alert("Error", "No cards available");
      return;
    }
    router.push({
      pathname: "/(authenticated)/(flashcardFlow)/flashcardQuestion",
      params: {
        flashcardIndex: flashcardIndex!.toString(),
        numberOfCards: numberOfCards,
      },
    });
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters({
      mastered: false,
      learned: false,
      unlearned: false,
    });
    setSortBy("newest");
  };

  if (loading || !flashcard) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <ProcessingLoader title="Loading flashcard set..." message="This may take a few seconds." />
      </View>
    );
  }

  const masteryPercentage = calculateMasteryPercentage(flashcard);
  const totalCards = flashcard.cards.length;

  // Apply filters and sorting
  // Note: Helper functions use confusing type aliases, so we need to cast
  let displayedCards = flashcard.cards as any;
  displayedCards = searchCards(displayedCards, searchQuery);
  displayedCards = filterCards(displayedCards, filters);
  displayedCards = sortCards(displayedCards, sortBy);

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getTabBarPadding(insets.bottom) }]}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>{flashcard.title}</Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            {totalCards} Flashcards • {masteryPercentage}% Mastery
          </Text>
        </View>

        <View style={styles.actionButtonsRow}>
            {/* Add Card Button */}
            <SecondaryButton 
                onPress={() => setShowAddModal(true)} 
                disabled={resetting} 
                icon="add" 
                title="Add"
            />
            {/* Reset Progress Button*/}
            <SecondaryButton 
                onPress={handleResetProgress} 
                disabled={resetting} 
                icon="refresh" 
                title="Reset Progress"
            />
        </View>
        <View style={styles.settingsContainer}>
          <NumericalInput
            title="Cards per Round"
            value={numberOfCards}
            onChangeText={setNumberOfCards}
            keyboardType="numeric"
            placeholder="10"
          />
          
        </View>
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textPrimary }]}>Created:</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(flashcard.creationDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textPrimary }]}>Last Reviewed:</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(flashcard.lastReviewed)}</Text>
          </View>
        <View style={styles.startButtonContainer}>
          <AuthenticationButton
            onPress={handleStartFlashcards}
            title="Start Flashcards"
            disabled={resetting || totalCards === 0}
          />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchBarWrapper}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search cards..."
              />
            </View>
            <FilterButton onPress={() => setShowFilterModal(true)} />
          </View>
        </View>

        <View style={styles.cardsContainer}>
          {displayedCards.map((card: FlashcardType, displayIndex: number) => {
            // Find original index in the full cards array
            const originalIndex = flashcard.cards.findIndex(
              (c) => c.question === card.question && c.answer === card.answer
            );
            // Use displayIndex as fallback key if originalIndex not found
            const cardKey = originalIndex >= 0 ? originalIndex : displayIndex;
            const isExpanded = expandedCards.has(cardKey);

            return (
              <FlashcardAccordionItem
                key={cardKey}
                card={card}
                cardKey={cardKey}
                isExpanded={isExpanded}
                onToggle={toggleCardExpansion}
                onEdit={openEditModal}
                onDelete={handleDeleteCard}
                originalIndex={originalIndex}
              />
            );
          })}
        </View>

        {displayedCards.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards match your filters</Text>
          </View>
        )}

        
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filters</Text>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Filter By:</Text>
            <Pressable
              style={styles.filterOption}
              onPress={() =>
                setFilters({ ...filters, mastered: !filters.mastered })
              }
            >
              <Ionicons
                name={filters.mastered ? "checkbox" : "square-outline"}
                size={24}
                color={filters.mastered ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Mastered Cards</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() =>
                setFilters({ ...filters, learned: !filters.learned })
              }
            >
              <Ionicons
                name={filters.learned ? "checkbox" : "square-outline"}
                size={24}
                color={filters.learned ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Learned Cards</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() =>
                setFilters({ ...filters, unlearned: !filters.unlearned })
              }
            >
              <Ionicons
                name={filters.unlearned ? "checkbox" : "square-outline"}
                size={24}
                color={filters.unlearned ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Unlearned Cards</Text>
            </Pressable>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Sort By:</Text>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy("newest")}
            >
              <Ionicons
                name={sortBy === "newest" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortBy === "newest" ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Newest First</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy("oldest")}
            >
              <Ionicons
                name={sortBy === "oldest" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortBy === "oldest" ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Oldest First</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy("title-asc")}
            >
              <Ionicons
                name={sortBy === "title-asc" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortBy === "title-asc" ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Title A-Z</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy("title-desc")}
            >
              <Ionicons
                name={sortBy === "title-desc" ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortBy === "title-desc" ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Title Z-A</Text>
            </Pressable>

            <View style={styles.modalButtons}>
                <SecondaryButton
                onPress={handleResetFilters}
                disabled={false}
                title="Reset"
                inactiveColor={theme === 'dark' ? '#3a3a3a' : '#d2d2d2'}
                activeColor={theme === 'dark' ? '#464646' : '#e0e0e0'}
                textColor={theme === 'dark' ? '#e0e0e0' : '#121212'}
              />
              <SecondaryButton
                onPress={handleApplyFilters}
                disabled={false}
                title="Apply"
                inactiveColor="#1374b9"
                activeColor="#0d5a8a"
                textColor="#e0e0e0"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Card Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setNewCardQuestion("");
          setNewCardAnswer("");
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowAddModal(false);
            setNewCardQuestion("");
            setNewCardAnswer("");
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <Pressable 
              style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Card</Text>
                <MultilineInput
                  title="Question"
                  value={newCardQuestion}
                  onChangeText={setNewCardQuestion}
                  placeholder="Enter question..."
                />
                <MultilineInput
                  title="Answer"
                  value={newCardAnswer}
                  onChangeText={setNewCardAnswer}
                  placeholder="Enter answer..."
                />
                <View style={styles.modalButtons}>
                    <SecondaryButton
                        onPress={() => {
                            setShowAddModal(false);
                            setNewCardQuestion("");
                            setNewCardAnswer("");
                          }}
                        disabled={false}
                        title="Cancel"
                        inactiveColor={theme === 'dark' ? '#3a3a3a' : '#d2d2d2'}
                        activeColor={theme === 'dark' ? '#464646' : '#e0e0e0'}
                        textColor={theme === 'dark' ? '#e0e0e0' : '#121212'}
                    />
                    <SecondaryButton
                        onPress={handleAddCard}
                        disabled={false}
                        title="Save"
                        inactiveColor="#1374b9"
                        activeColor="#0d5a8a"
                        textColor="#e0e0e0"
                    />
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Edit Card Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingCardIndex(null);
          setNewCardQuestion("");
          setNewCardAnswer("");
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowEditModal(false);
            setEditingCardIndex(null);
            setNewCardQuestion("");
            setNewCardAnswer("");
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <Pressable 
              style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Card</Text>
                <MultilineInput
                  title="Question"
                  value={newCardQuestion}
                  onChangeText={setNewCardQuestion}
                  placeholder="Enter question..."
                />
                <MultilineInput
                  title="Answer"
                  value={newCardAnswer}
                  onChangeText={setNewCardAnswer}
                  placeholder="Enter answer..."
                />
                <View style={styles.modalButtons}>
                    <SecondaryButton
                        onPress={() => {
                            setShowEditModal(false);
                            setEditingCardIndex(null);
                            setNewCardQuestion("");
                            setNewCardAnswer("");
                          }}
                        disabled={false}
                        title="Cancel"
                        inactiveColor={theme === 'dark' ? '#3a3a3a' : '#d2d2d2'}
                        activeColor={theme === 'dark' ? '#464646' : '#e0e0e0'}
                        textColor={theme === 'dark' ? '#e0e0e0' : '#121212'}
                    />
                    <SecondaryButton
                        onPress={handleEditCard}
                        disabled={false}
                        title="Save"
                        inactiveColor="#1374b9"
                        activeColor="#0d5a8a"
                        textColor="#e0e0e0"
                    />
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    height: "100%",
    width: "100%",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 70,
    marginBottom: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 18,
    fontFamily: "Inter",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBarWrapper: {
    flex: 1,
  },
  cardsContainer: {
    marginBottom: 20,
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
  accordionHeaderLeft: {
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  accordionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  cardContent: {
    gap: 10,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  cardText: {
    fontSize: 16,
    fontFamily: "Inter",
    lineHeight: 24,
    marginBottom: 10,
  },
  settingsContainer: {
    marginBottom: 20,
  },
  startButtonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter",
    marginBottom: 20,
    textAlign: "center",
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter",
    marginTop: 15,
    marginBottom: 10,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  filterOptionText: {
    fontSize: 16,
    fontFamily: "Inter",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginBottom: 10,
    gap: 10,
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
  }
});

