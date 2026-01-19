/**
 * Centralized type definitions for the AI Flashcard App
 * All interfaces should be imported from this file to maintain consistency
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Individual quiz question structure
 */
export interface QuizQuestion {
  type: 'multiple-choice' | 'multiple-selection' | 'fill-in-the-blank';
  question: string;
  answer: string | string[];
  options: string[];
  currentAnswer: string | string[];
}

/**
 * Complete quiz data structure (client-side)
 * Uses `any` for Timestamp to match Firestore client SDK
 */
export interface Quiz {
  title: string;
  creationDate: any;
  isComplete: boolean;
  lastAccessed: any;
  lastQuestionIndex?: number;
  score: number;
  tags: string[];
  questionsList: QuizQuestion[];
  bookmarkedQuestions: number[]; // REQUIRED - always present (can be empty array)
}

/**
 * Quiz data for Firestore operations
 * Same as Quiz but with explicit `any` for timestamps
 */
export interface QuizData {
  title: string;
  creationDate: any;
  isComplete: boolean;
  lastAccessed: any;
  lastQuestionIndex?: number;
  score: number;
  tags: string[];
  questionsList: QuizQuestion[];
  bookmarkedQuestions: number[]; // REQUIRED - always present (can be empty array)
}

/**
 * Individual flashcard card structure
 */
export interface Flashcard {
  question: string;
  answer: string;
  status: 'complete' | 'review';
  confidenceLevel: number; // 0-5 scale
}

/**
 * Complete flashcard set data structure (client-side)
 * Uses `any` for Timestamp to match Firestore client SDK
 */
export interface FlashcardSet {
  title: string;
  tags: string[];
  creationDate: any;
  lastReviewed: any;
  cards: Flashcard[];
}

/**
 * Flashcard data for Firestore operations
 * Same as FlashcardSet but with explicit `any` for timestamps
 */
export interface FlashcardData {
  title: string;
  tags: string[];
  creationDate: any;
  lastReviewed: any;
  cards: Flashcard[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from Gemini API for quizzes
 * Does not include currentAnswer (user hasn't answered yet)
 */
export interface GeminiQuizResponse {
  title: string;
  tags: string[];
  questionsList: {
    type: 'multiple-choice' | 'multiple-selection' | 'fill-in-the-blank';
    question: string;
    answer: string | string[];
    options: string[];
  }[];
}

/**
 * Response from Gemini API for flashcards
 * Does not include status or confidenceLevel (set during transformation)
 */
export interface GeminiFlashcardResponse {
  title: string;
  tags: string[];
  cards: {
    question: string;
    answer: string;
  }[];
}

// ============================================================================
// Cloud Function Types
// ============================================================================

/**
 * File data structure for Cloud Functions
 */
export interface FileData {
  name: string;
  type: 'pdf' | 'image';
  base64: string;
}

/**
 * Request to Cloud Function
 */
export interface ProcessNotesRequest {
  files: FileData[];
  selectionType: 'flashcard' | 'quiz';
  numberOfItems: number;
  quizQuestionTypes?: string[];
  notes?: string;
}

/**
 * Response from Cloud Function
 */
export interface ProcessNotesResponse {
  success: boolean;
  data?: GeminiFlashcardResponse | GeminiQuizResponse;
  error?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Card status types for flashcards
 */
export type CardStatus = 'mastered' | 'learning' | 'unlearned';

/**
 * Filter options for flashcards
 */
export interface FilterOptions {
  mastered: boolean;
  learned: boolean;
  unlearned: boolean;
}

/**
 * Sort option types
 */
export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

/**
 * Session result for a flashcard card
 */
export interface SessionResult {
  cardIndex: number;
  wasCorrect: boolean;
  previousConfidence: number;
  newConfidence: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  know: number;
  learning: number;
  accuracy: number; // percentage
}

// ============================================================================
// Extended Types
// ============================================================================

/**
 * Extended QuizQuestion for quiz results
 * Includes additional fields for displaying incorrect answers
 */
export interface IncorrectQuestion extends QuizQuestion {
  index: number;
  userAnswer: string | string[];
  correctAnswer: string | string[];
}

// ============================================================================
// Type Aliases for Compatibility
// ============================================================================

/**
 * Type alias for QuizQuestion (for backward compatibility)
 */
export type QuizQuestionType = QuizQuestion;

