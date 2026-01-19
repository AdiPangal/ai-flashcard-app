/**
 * Quiz helper utilities
 */

import { Quiz, QuizQuestion, QuizQuestionType } from '@/types';

// Re-export for backward compatibility
export type { Quiz, QuizQuestion, QuizQuestionType };

/**
 * Calculate the Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');    // Normalize whitespace
}

/**
 * Check if two answers match using fuzzy matching
 * Allows for minor spelling differences (1-2 characters)
 */
export function fuzzyMatch(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer || !correctAnswer) {
    return false;
  }
  
  const normalizedUser = normalizeString(userAnswer);
  const normalizedCorrect = normalizeString(correctAnswer);
  
  // Exact match after normalization
  if (normalizedUser === normalizedCorrect) {
    return true;
  }
  
  // Check if one string contains the other (for partial matches)
  if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
    return true;
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
  const maxLength = Math.max(normalizedUser.length, normalizedCorrect.length);
  
  // Allow 1-2 character differences or up to 10% of string length
  const maxAllowedDistance = Math.max(2, Math.floor(maxLength * 0.1));
  
  return distance <= maxAllowedDistance;
}

/**
 * Check if two arrays match (order doesn't matter)
 */
export function arrayMatch(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  
  return sorted1.every((val, index) => val === sorted2[index]);
}

/**
 * Check if a single answer matches the correct answer based on question type
 */
export function checkAnswer(
  userAnswer: string | string[],
  correctAnswer: string | string[],
  questionType: 'multiple-choice' | 'multiple-selection' | 'fill-in-the-blank'
): boolean {
  if (questionType === 'multiple-choice') {
    return userAnswer === correctAnswer;
  }
  
  if (questionType === 'multiple-selection') {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      return arrayMatch(userAnswer, correctAnswer);
    }
    return false;
  }
  
  if (questionType === 'fill-in-the-blank') {
    if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
      return fuzzyMatch(userAnswer, correctAnswer);
    }
    return false;
  }
  
  return false;
}

/**
 * Calculate quiz score based on correct answers
 */
export function calculateQuizScore(quiz: Quiz): number {
  if (!quiz.questionsList || quiz.questionsList.length === 0) {
    return 0;
  }
  
  let correctCount = 0;
  
  quiz.questionsList.forEach((question) => {
    const isCorrect = checkAnswer(
      question.currentAnswer,
      question.answer,
      question.type
    );
    
    if (isCorrect) {
      correctCount++;
    }
  });
  
  return Math.round((correctCount / quiz.questionsList.length) * 100);
}

