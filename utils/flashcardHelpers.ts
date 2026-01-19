/**
 * Flashcard helper utilities
 */

import { 
  Flashcard as FlashcardType, 
  FlashcardSet as FlashcardSetType, 
  CardStatus, 
  FilterOptions, 
  SortOption, 
  SessionResult, 
  SessionStats 
} from '@/types';

// Re-export with old names for backward compatibility during transition
export type Flashcard = FlashcardSetType;
export type FlashcardCard = FlashcardType;

/**
 * Get card status based on confidence level
 */
export function getCardStatus(confidenceLevel: number): CardStatus {
  if (confidenceLevel === 5) {
    return "mastered";
  } else if (confidenceLevel >= 1 && confidenceLevel < 5) {
    return "learning";
  } else {
    return "unlearned";
  }
}

/**
 * Calculate mastery percentage based on cards with confidenceLevel === 5
 */
export function calculateMasteryPercentage(flashcard: FlashcardSet): number {
  if (!flashcard.cards || flashcard.cards.length === 0) {
    return 0;
  }

  const masteredCount = flashcard.cards.filter(
    (card) => card.confidenceLevel === 5
  ).length;

  return Math.round((masteredCount / flashcard.cards.length) * 100);
}

/**
 * Update card confidence based on correctness
 */
export function updateCardConfidence(
  currentLevel: number,
  isCorrect: boolean
): number {
  if (isCorrect) {
    return Math.min(5, currentLevel + 1);
  } else {
    return Math.max(0, currentLevel - 1);
  }
}

/**
 * Filter cards based on filter options
 */
export function filterCards(
  cards: Flashcard[],
  filters: FilterOptions
): Flashcard[] {
  if (!filters.mastered && !filters.learned && !filters.unlearned) {
    // No filters selected, return all
    return cards;
  }

  return cards.filter((card) => {
    const status = getCardStatus(card.confidenceLevel);
    if (status === "mastered" && filters.mastered) return true;
    if (status === "learning" && filters.learned) return true;
    if (status === "unlearned" && filters.unlearned) return true;
    return false;
  });
}

/**
 * Sort cards based on sort option
 */
export function sortCards(
  cards: Flashcard[],
  sortBy: SortOption
): Flashcard[] {
  const sorted = [...cards];

  switch (sortBy) {
    case "newest":
      // Keep original order (newest at end of array)
      return sorted.reverse();
    case "oldest":
      // Keep original order (oldest at start of array)
      return sorted;
    case "title-asc":
      return sorted.sort((a, b) =>
        a.question.localeCompare(b.question, undefined, { sensitivity: "base" })
      );
    case "title-desc":
      return sorted.sort((a, b) =>
        b.question.localeCompare(a.question, undefined, { sensitivity: "base" })
      );
    default:
      return sorted;
  }
}

/**
 * Calculate session statistics from results
 */
export function calculateSessionStats(
  sessionResults: SessionResult[]
): SessionStats {
  if (!sessionResults || sessionResults.length === 0) {
    return {
      know: 0,
      learning: 0,
      accuracy: 0,
    };
  }

  let know = 0;
  let learning = 0;
  let correct = 0;

  sessionResults.forEach((result) => {
    if (result.wasCorrect || result.newConfidence === 5) {
      know++;
      correct++;
    } else {
      learning++;
    }
  });

  const accuracy = Math.round((correct / sessionResults.length) * 100);

  return {
    know,
    learning,
    accuracy,
  };
}

/**
 * Search cards by question or answer text
 */
export function searchCards(
  cards: Flashcard[],
  searchQuery: string
): Flashcard[] {
  if (!searchQuery || searchQuery.trim() === "") {
    return cards;
  }

  const query = searchQuery.toLowerCase().trim();

  return cards.filter((card) => {
    const questionMatch = card.question.toLowerCase().includes(query);
    const answerMatch = card.answer.toLowerCase().includes(query);
    return questionMatch || answerMatch;
  });
}

/**
 * Update card status based on confidence level
 * Status is "complete" if confidenceLevel === 5, "review" otherwise
 */
export function updateCardStatus(card: Flashcard): Flashcard {
  return {
    ...card,
    status: card.confidenceLevel === 5 ? "complete" : "review",
  };
}

/**
 * History sort option types
 */
export type HistorySortOption = 
  | "newest" 
  | "oldest" 
  | "name-asc" 
  | "name-desc"
  | "last-accessed-newest"
  | "last-accessed-oldest"
  | "created-newest"
  | "created-oldest";

/**
 * Search history items (flashcards or quizzes) by title and tags
 */
export function searchHistoryItems<T extends { title: string; tags: string[] }>(
  items: T[],
  query: string
): T[] {
  if (!query || query.trim() === "") {
    return items;
  }

  const searchQuery = query.toLowerCase().trim();

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(searchQuery);
    const tagMatch = item.tags.some((tag) =>
      tag.toLowerCase().includes(searchQuery)
    );
    return titleMatch || tagMatch;
  });
}

/**
 * Get access timestamp for sorting (most recently accessed)
 */
function getAccessTimestamp(item: FlashcardSet | any, type: "flashcard" | "quiz"): Date | null {
  if (type === "flashcard") {
    const flashcard = item as FlashcardSet;
    if (flashcard.lastReviewed && flashcard.lastReviewed.toDate) {
      return flashcard.lastReviewed.toDate();
    }
  } else {
    const quiz = item as any;
    if (quiz.lastAccessed && quiz.lastAccessed.toDate) {
      return quiz.lastAccessed.toDate();
    }
  }
  // Fallback to creationDate
  if (item.creationDate && item.creationDate.toDate) {
    return item.creationDate.toDate();
  }
  return null;
}

/**
 * Sort history items (flashcards or quizzes)
 */
export function sortHistoryItems<T extends FlashcardSet | any>(
  items: T[],
  sortBy: HistorySortOption,
  type: "flashcard" | "quiz"
): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case "newest": {
      // Sort by most recently accessed (lastReviewed/lastAccessed), fallback to creationDate
      return sorted.sort((a, b) => {
        const aDate = getAccessTimestamp(a, type);
        const bDate = getAccessTimestamp(b, type);
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return bDate.getTime() - aDate.getTime(); // Descending (newest first)
      });
    }
    case "oldest": {
      // Sort by creationDate, ascending
      return sorted.sort((a, b) => {
        const aDate = a.creationDate?.toDate ? a.creationDate.toDate() : null;
        const bDate = b.creationDate?.toDate ? b.creationDate.toDate() : null;
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return aDate.getTime() - bDate.getTime(); // Ascending (oldest first)
      });
    }
    case "name-asc": {
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    }
    case "name-desc": {
      return sorted.sort((a, b) =>
        b.title.localeCompare(a.title, undefined, { sensitivity: "base" })
      );
    }
    case "last-accessed-newest": {
      // Sort by last accessed/reviewed, newest first
      return sorted.sort((a, b) => {
        const aDate = getAccessTimestamp(a, type);
        const bDate = getAccessTimestamp(b, type);
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return bDate.getTime() - aDate.getTime(); // Descending (newest first)
      });
    }
    case "last-accessed-oldest": {
      // Sort by last accessed/reviewed, oldest first
      return sorted.sort((a, b) => {
        const aDate = getAccessTimestamp(a, type);
        const bDate = getAccessTimestamp(b, type);
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return aDate.getTime() - bDate.getTime(); // Ascending (oldest first)
      });
    }
    case "created-newest": {
      // Sort by creation date, newest first
      return sorted.sort((a, b) => {
        const aDate = a.creationDate?.toDate ? a.creationDate.toDate() : null;
        const bDate = b.creationDate?.toDate ? b.creationDate.toDate() : null;
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return bDate.getTime() - aDate.getTime(); // Descending (newest first)
      });
    }
    case "created-oldest": {
      // Sort by creation date, oldest first
      return sorted.sort((a, b) => {
        const aDate = a.creationDate?.toDate ? a.creationDate.toDate() : null;
        const bDate = b.creationDate?.toDate ? b.creationDate.toDate() : null;
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        return aDate.getTime() - bDate.getTime(); // Ascending (oldest first)
      });
    }
    default:
      return sorted;
  }
}

