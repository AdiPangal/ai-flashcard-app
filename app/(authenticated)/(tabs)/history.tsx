import { useState, useEffect, useCallback} from 'react';
import { useFocusEffect} from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import type { Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import InputBox from '@/components/userInput/inputBox';
import SearchBar from '@/components/userInput/searchBar';
import SelectionButton from '@/components/buttons/selectionButton';
import FilterButton from '@/components/buttons/filterButton';
import HorizontalLine from '@/components/horizontalLine';
import { sortHistoryItems, HistorySortOption } from '@/utils/flashcardHelpers';
import { FlashcardSet, Quiz } from '@/types';
import { getTabBarPadding } from '@/utils/tabBarHelpers';
import SecondaryButton from '@/components/buttons/secondaryButton';

export default function HistoryScreen() {
  const { userId, db } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'flashcard' | 'quiz'>('flashcard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<HistorySortOption>('last-accessed-newest');
  const [originalSortBy, setOriginalSortBy] = useState<HistorySortOption>('last-accessed-newest');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [userId])
  );


  const loadHistory = async () => {
    // Check if user is logged in and database is connected
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    // Starts to load history from the database
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const history = userData.history || {};
        
        setFlashcards(history.flashcards || []);
        setQuizzes(history.quizzes || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formats the date to a readable format in the history screen
  const formatDate = (timestamp: Timestamp): string => {
    if (!timestamp || !timestamp.toDate) {
      return 'Unknown date';
    }
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handles the deletion of an item from the history
  const handleDeleteItem = async (index: number) => {
    if (!userId || !db) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${selectedType === 'flashcard' ? flashcards[index]?.title : quizzes[index]?.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(index);
              const userRef = doc(db, 'users', userId);
              const userDoc = await getDoc(userRef);

              if (!userDoc.exists()) {
                Alert.alert('Error', 'User not found');
                return;
              }
              // Deletes the item from firestore database
              if (selectedType === 'flashcard') {
                const updatedFlashcards = flashcards.filter((_, idx) => idx !== index);
                await updateDoc(userRef, {
                  'history.flashcards': updatedFlashcards,
                });
                setFlashcards(updatedFlashcards);
              } else {
                const updatedQuizzes = quizzes.filter((_, idx) => idx !== index);
                await updateDoc(userRef, {
                  'history.quizzes': updatedQuizzes,
                });
                setQuizzes(updatedQuizzes);
              }
              
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  // Handles the editing of the title of an item
  const handleEditTitle = (index: number, currentTitle: string) => {
    setEditingIndex(index);
    setEditingTitle(currentTitle);
  };

  // Handles the saving of the title of an item
  const handleSaveTitle = async (index: number) => {
    if (!editingTitle.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      handleCancelEdit();
      return;
    }

    // Get the original title to compare
    const originalTitle = selectedType === 'flashcard' 
      ? flashcards[index]?.title 
      : quizzes[index]?.title;

    // If title hasn't changed, just cancel
    if (originalTitle === editingTitle.trim()) {
      handleCancelEdit();
      return;
    }

    if (!userId || !db) return;

    try {
      setSaving(true);
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Alert.alert('Error', 'User not found');
        handleCancelEdit();
        return;
      }

      if (selectedType === 'flashcard') {
        const updatedFlashcards = [...flashcards];
        updatedFlashcards[index].title = editingTitle.trim();
        await updateDoc(userRef, {
          'history.flashcards': updatedFlashcards,
        });
        setFlashcards(updatedFlashcards);
      } else {
        const updatedQuizzes = [...quizzes];
        updatedQuizzes[index].title = editingTitle.trim();
        await updateDoc(userRef, {
          'history.quizzes': updatedQuizzes,
        });
        setQuizzes(updatedQuizzes);
      }

      setEditingIndex(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating title:', error);
      Alert.alert('Error', 'Failed to update title');
      handleCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingTitle('');
  };

  const handleOpenFilterModal = () => {
    setOriginalSortBy(sortBy);
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    setOriginalSortBy(sortBy);
    setShowFilterModal(false);
  };

  const handleCancelFilters = () => {
    setSortBy(originalSortBy);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setSortBy('last-accessed-newest');
  };

  // Apply search and sorting while preserving original indices
  const getDisplayedItemsWithIndices = () => {
    const items = selectedType === 'flashcard' ? flashcards : quizzes;
    // Create array with items and their original indices
    let itemsWithIndices = items.map((item, originalIndex) => ({ item, originalIndex }));
    
    // Apply search
    if (searchQuery.trim()) {
      itemsWithIndices = itemsWithIndices.filter(({ item }) => {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(query);
        const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(query));
        return titleMatch || tagMatch;
      });
    }
    
    // Extract items for sorting
    const itemsToSort = itemsWithIndices.map(({ item }) => item);
    const sortedItems = sortHistoryItems(itemsToSort, sortBy, selectedType);
    
    // Map sorted items back to include original indices by matching items
    // Use a Map to track which indices have been used to handle duplicates
    const usedIndices = new Set<number>();
    return sortedItems.map((sortedItem) => {
      // Find the matching item with original index
      const found = itemsWithIndices.find(({ item, originalIndex }) => {
        // Match by title and creation date timestamp
        if (item.title !== sortedItem.title) return false;
        
        const itemDate = item.creationDate?.toDate ? item.creationDate.toDate().getTime() : null;
        const sortedDate = sortedItem.creationDate?.toDate ? sortedItem.creationDate.toDate().getTime() : null;
        
        if (itemDate !== sortedDate) return false;
        
        // Also check if this index hasn't been used yet (handle duplicates)
        if (usedIndices.has(originalIndex)) return false;
        
        return true;
      });
      
      if (found) {
        usedIndices.add(found.originalIndex);
        return { item: sortedItem, originalIndex: found.originalIndex };
      }
      
      // Fallback: find by title only if exact match fails
      const fallback = itemsWithIndices.find(({ item, originalIndex }) => 
        item.title === sortedItem.title && !usedIndices.has(originalIndex)
      );
      
      if (fallback) {
        usedIndices.add(fallback.originalIndex);
        return { item: sortedItem, originalIndex: fallback.originalIndex };
      }
      
      return { item: sortedItem, originalIndex: -1 };
    });
  };

  const renderFlashcard = ({ item, originalIndex }: { item: FlashcardSet; originalIndex: number }) => {
    const isEditing = editingIndex === originalIndex;
    const isDeleting = deleting === originalIndex;

    return (
      <Pressable 
        style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        onPress={() => {
          if (!isEditing) {
            router.push({
              pathname: '/(authenticated)/(flashcardFlow)/flashcardHome',
              params: { flashcardIndex: originalIndex.toString() }
            });
          }
        }}
        disabled={isEditing || isDeleting}
      >
        <View style={styles.cardHeader}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.titleInput, { color: colors.textPrimary, backgroundColor: colors.backgroundTertiary, borderColor: colors.brandPrimary }]}
                value={editingTitle}
                onChangeText={setEditingTitle}
                onSubmitEditing={() => handleSaveTitle(originalIndex)}
                onBlur={() => {
                  // Small delay to allow cancel button to be pressed
                  setTimeout(() => {
                    if (editingIndex === originalIndex) {
                      handleSaveTitle(originalIndex);
                    }
                  }, 200);
                }}
                autoFocus
                placeholder="Enter title..."
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                onPress={() => handleCancelEdit()}
                style={styles.cancelEditButton}
              >
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Text 
              style={[styles.cardTitle, { color: colors.brandPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              onPress={(e) => {
                e.stopPropagation();
                handleEditTitle(originalIndex, item.title);
              }}
            >
              {item.title}
            </Text>
          )}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Card Actions',
                'Choose an action',
                [
                  {
                    text: 'Edit',
                    onPress: () => handleEditTitle(originalIndex, item.title),
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteItem(originalIndex),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            disabled={isEditing || isDeleting}
            style={styles.cardActionButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        {/* Number of flashcards badge */}
        <View style={styles.cardBadgeContainer}>
          <View style={[styles.cardBadge, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
            <Ionicons name="albums-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.cardCount, { color: colors.textTertiary }]}>{item.cards.length} flashcards</Text>
          </View>
        </View>
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          </View>
        )}
      </Pressable>
    );
  };

  const renderQuiz = ({ item, originalIndex }: { item: Quiz; originalIndex: number }) => {
    const isEditing = editingIndex === originalIndex;
    const isDeleting = deleting === originalIndex;

    return (
        // Button used to navigate to the quiz home screen
      <Pressable 
        style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        onPress={() => {
          if (!isEditing) {
            router.push({
              pathname: '/(authenticated)/(quizFlow)/quizHome',
              params: { quizIndex: originalIndex.toString() }
            });
          }
        }}
        disabled={isEditing || isDeleting}
      >
        <View style={styles.cardHeader}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.titleInput, { color: colors.textPrimary, backgroundColor: colors.backgroundTertiary, borderColor: colors.brandPrimary }]}
                value={editingTitle}
                onChangeText={setEditingTitle}
                onSubmitEditing={() => handleSaveTitle(originalIndex)}
                onBlur={() => {
                  // Small delay to allow cancel button to be pressed
                  setTimeout(() => {
                    if (editingIndex === originalIndex) {
                      handleSaveTitle(originalIndex);
                    }
                  }, 200);
                }}
                autoFocus
                placeholder="Enter title..."
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                onPress={() => handleCancelEdit()}
                style={styles.cancelEditButton}
              >
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Text 
              style={[styles.cardTitle, { color: colors.brandPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              onPress={(e) => {
                e.stopPropagation();
                handleEditTitle(originalIndex, item.title);
              }}
            >
              {item.title}
            </Text>
          )}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Quiz Actions',
                'Choose an action',
                [
                  {
                    text: 'Edit',
                    onPress: () => handleEditTitle(originalIndex, item.title),
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteItem(originalIndex),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            disabled={isEditing || isDeleting}
            style={styles.cardActionButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        {/* Number of questions badge */}
        <View style={styles.cardBadgeContainer}>
          <View style={[styles.cardBadge, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.cardCount, { color: colors.textTertiary }]}>{item.questionsList.length} questions</Text>
          </View>
          {item.isComplete && (
            <View style={[styles.cardBadge, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.cardCount, { color: colors.textTertiary }]}>Score: {item.score}%</Text>
            </View>
          )}
        </View>
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const displayedItemsWithIndices = getDisplayedItemsWithIndices();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
      </View>
      {/* Tabs for selecting the type of item to display */}
      <View style={styles.tabsContainer}>
        <SelectionButton
          title={`Flashcards (${flashcards.length})`}
          selected={selectedType === 'flashcard'}
          onPress={() => {
            setSelectedType('flashcard');
            setEditingIndex(null);
            setEditingTitle('');
          }}
          activeIcon="albums"
          inactiveIcon="albums-outline"
        />
        <SelectionButton
          title={`Quizzes (${quizzes.length})`}
          selected={selectedType === 'quiz'}
          onPress={() => {
            setSelectedType('quiz');
            setEditingIndex(null);
            setEditingTitle('');
          }}
          activeIcon="help-circle"
          inactiveIcon="help-circle-outline"
        />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
            />
          </View>
          <FilterButton onPress={handleOpenFilterModal} />
        </View>
      </View>

      <FlatList
        data={displayedItemsWithIndices}
        renderItem={({ item: { item, originalIndex }, index }) => {
          return selectedType === 'flashcard'
            ? renderFlashcard({ item: item as FlashcardSet, originalIndex })
            : renderQuiz({ item: item as Quiz, originalIndex });
        }}
        keyExtractor={(item, index) =>
          selectedType === 'flashcard'
            ? `flashcard-${item.originalIndex}-${(item.item as FlashcardSet).title}`
            : `quiz-${item.originalIndex}-${(item.item as Quiz).title}`
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: getTabBarPadding(insets.bottom) }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                selectedType === 'flashcard'
                  ? 'albums-outline'
                  : 'help-circle-outline'
              }
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim()
                ? `No ${selectedType === 'flashcard' ? 'flashcards' : 'quizzes'} match your search`
                : `No ${selectedType === 'flashcard' ? 'flashcards' : 'quizzes'} yet`}
            </Text>
            {!searchQuery.trim() && (
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Create your first {selectedType === 'flashcard' ? 'flashcard' : 'quiz'} from the Home tab
              </Text>
            )}
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelFilters}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleCancelFilters}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filters</Text>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Sort by Name:</Text>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('name-asc')}
            >
              <Ionicons
                name={sortBy === 'name-asc' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'name-asc' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Name A-Z</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('name-desc')}
            >
              <Ionicons
                name={sortBy === 'name-desc' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'name-desc' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Name Z-A</Text>
            </Pressable>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Sort by Last Accessed:</Text>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('last-accessed-newest')}
            >
              <Ionicons
                name={sortBy === 'last-accessed-newest' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'last-accessed-newest' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Most Recently Accessed</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('last-accessed-oldest')}
            >
              <Ionicons
                name={sortBy === 'last-accessed-oldest' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'last-accessed-oldest' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Least Recently Accessed</Text>
            </Pressable>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Sort by Creation Date:</Text>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('created-newest')}
            >
              <Ionicons
                name={sortBy === 'created-newest' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'created-newest' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Newest Created</Text>
            </Pressable>
            <Pressable
              style={styles.filterOption}
              onPress={() => setSortBy('created-oldest')}
            >
              <Ionicons
                name={sortBy === 'created-oldest' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={sortBy === 'created-oldest' ? colors.brandPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterOptionText, { color: colors.textPrimary }]}>Oldest Created</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 20,
  },
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    marginBottom: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1374B9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b6b6b',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#1374B9',
  },
  listContent: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 12,
  },
  cardActionButton: {
    padding: 4,
  },
  cardBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelEditButton: {
    padding: 4,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  cardCount: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 15,
    marginBottom: 10,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  filterOptionText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 10,
    gap: 10,
  }
});

