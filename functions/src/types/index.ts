// Types for Cloud Functions

export interface FileData {
  name: string;
  type: 'pdf' | 'image';
  base64: string; // Base64 encoded file data
}

export interface ProcessNotesRequest {
  files: FileData[]; // Base64 file data (changed from fileUrls)
  selectionType: 'flashcard' | 'quiz';
  numberOfItems: number;
  quizQuestionTypes?: string[];
  notes?: string;
}

export interface ProcessNotesResponse {
  success: boolean;
  data?: GeminiFlashcardResponse | GeminiQuizResponse; // Return raw AI response
  error?: string;
}

export interface FlashcardData {
  title: string;
  tags: string[];
  creationDate: FirebaseFirestore.Timestamp;
  lastReviewed: FirebaseFirestore.Timestamp;
  cards: FlashcardCard[];
}

export interface FlashcardCard {
  question: string;
  answer: string;
  status: 'complete' | 'review';
  confidenceLevel: number;
}

export interface QuizData {
  title: string;
  creationDate: FirebaseFirestore.Timestamp;
  isComplete: boolean;
  lastAccessed: FirebaseFirestore.Timestamp;
  lastQuestionIndex?: number; // Index of last question accessed (defaults to 0)
  score: number;
  tags: string[];
  questionsList: QuizQuestion[];
  bookmarkedQuestions: number[]; // REQUIRED - always present (can be empty array)
}

export interface QuizQuestion {
  type: 'multiple-choice' | 'multiple-selection' | 'fill-in-the-blank';
  question: string;
  answer: string | string[];
  options: string[];
  currentAnswer: string | string[];
}

export interface ExtractedFileData {
  fileName: string;
  fileType: string;
  textContent: string;
  isDiagram?: boolean;
  diagramDescription?: string;
}

export interface GeminiFlashcardResponse {
  title: string;
  tags: string[];
  cards: {
    question: string;
    answer: string;
  }[];
}

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

