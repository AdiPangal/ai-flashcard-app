import { GeminiFlashcardResponse, GeminiQuizResponse } from '../types';
import * as logger from 'firebase-functions/logger';

/**
 * Parse and validate Gemini JSON response for flashcards
 */
export function parseFlashcardResponse(response: string): GeminiFlashcardResponse {
  try {
    // Remove any markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/i, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/i, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate structure
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error('Invalid flashcard response: missing or invalid title');
    }
    
    if (!Array.isArray(parsed.cards)) {
      throw new Error('Invalid flashcard response: cards must be an array');
    }
    
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }
    
    // Validate each card
    for (const card of parsed.cards) {
      if (!card.question || typeof card.question !== 'string') {
        throw new Error('Invalid flashcard response: card missing question');
      }
      if (!card.answer || typeof card.answer !== 'string') {
        throw new Error('Invalid flashcard response: card missing answer');
      }
    }
    
    return parsed as GeminiFlashcardResponse;
  } catch (error) {
    logger.error('Failed to parse flashcard response:', error);
    logger.error('Response was:', response);
    throw new Error(`Failed to parse flashcard JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse and validate Gemini JSON response for quizzes
 */
export function parseQuizResponse(response: string): GeminiQuizResponse {
  try {
    // Remove any markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/i, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/i, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate structure
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error('Invalid quiz response: missing or invalid title');
    }
    
    if (!Array.isArray(parsed.questionsList)) {
      throw new Error('Invalid quiz response: questionsList must be an array');
    }
    
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }
    
    // Validate each question
    const validTypes = ['multiple-choice', 'multiple-selection', 'fill-in-the-blank'];
    for (const question of parsed.questionsList) {
      if (!question.type || !validTypes.includes(question.type)) {
        throw new Error(`Invalid quiz response: question has invalid type: ${question.type}`);
      }
      if (!question.question || typeof question.question !== 'string') {
        throw new Error('Invalid quiz response: question missing question text');
      }
      if (question.answer === undefined || question.answer === null) {
        throw new Error('Invalid quiz response: question missing answer');
      }
      if (question.type === 'multiple-choice' || question.type === 'multiple-selection') {
        if (!Array.isArray(question.options) || question.options.length < 2) {
          throw new Error('Invalid quiz response: multiple-choice/selection missing options');
        }
        if (question.type === 'multiple-selection' && !Array.isArray(question.answer)) {
          throw new Error('Invalid quiz response: multiple-selection answer must be array');
        }
      }
    }
    
    return parsed as GeminiQuizResponse;
  } catch (error) {
    logger.error('Failed to parse quiz response:', error);
    logger.error('Response was:', response);
    throw new Error(`Failed to parse quiz JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

