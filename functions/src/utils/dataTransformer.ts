import { FlashcardData, QuizData, GeminiFlashcardResponse, GeminiQuizResponse } from '../types';

/**
 * Transform parsed Gemini response to Firestore flashcard format
 */
export function transformFlashcardData(
  parsed: GeminiFlashcardResponse
): Omit<FlashcardData, 'creationDate' | 'lastReviewed'> {
  return {
    title: parsed.title || 'Untitled Flashcard Set',
    tags: parsed.tags || [],
    cards: parsed.cards.map(card => ({
      question: card.question,
      answer: card.answer,
      status: 'review' as const,
      confidenceLevel: 0,
    })),
  };
}

/**
 * Transform parsed Gemini response to Firestore quiz format
 */
export function transformQuizData(
  parsed: GeminiQuizResponse
): Omit<QuizData, 'creationDate' | 'lastAccessed'> {
  return {
    title: parsed.title || 'Untitled Quiz',
    isComplete: false,
    score: 0,
    tags: parsed.tags || [],
    questionsList: parsed.questionsList.map(question => ({
      type: question.type,
      question: question.question,
      answer: question.answer,
      options: question.options || [],
      currentAnswer: question.type === 'multiple-selection' ? [] : '',
    })),
  };
}

