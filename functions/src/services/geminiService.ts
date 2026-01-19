import {GoogleGenerativeAI} from '@google/generative-ai';
import * as logger from 'firebase-functions/logger';
import * as functions from 'firebase-functions';
import {buildDiagramPrompt, buildFlashcardPrompt, buildQuizPrompt} from '../utils/promptBuilder';
import {parseFlashcardResponse, parseQuizResponse} from '../utils/jsonParser';
import {GeminiFlashcardResponse, GeminiQuizResponse} from '../types';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) {
    return genAI;
  }
  
  // In Firebase Functions v2, use process.env directly (functions.config() is deprecated)
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * Understand diagram using Gemini Pro multimodal capabilities
 */
export async function understandDiagram(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  try {
    const client = getGeminiClient();
    // Use gemini-2.0-flash (available models: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash)
    const model = client.getGenerativeModel({model: 'gemini-2.0-flash'});
    
    const prompt = buildDiagramPrompt();
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);
    
    const response = result.response;
    const text = response.text();
    
    logger.info(`Generated diagram description (${text.length} characters)`);
    
    return text;
  } catch (error) {
    logger.error('Error understanding diagram with Gemini:', error);
    throw new Error(`Failed to understand diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate flashcards using Gemini Pro
 */
export async function generateFlashcards(
  text: string,
  numCards: number,
  notes?: string
): Promise<GeminiFlashcardResponse> {
  try {
    const client = getGeminiClient();
    // Use gemini-2.0-flash (available models: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash)
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    
    const prompt = buildFlashcardPrompt(text, numCards, notes);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    logger.info('Generated flashcard content from Gemini');
    
    return parseFlashcardResponse(textResponse);
  } catch (error) {
    logger.error('Error generating flashcards with Gemini:', error);
    throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate quiz using Gemini Pro
 */
export async function generateQuiz(
  text: string,
  numQuestions: number,
  questionTypes: string[],
  notes?: string
): Promise<GeminiQuizResponse> {
  try {
    const client = getGeminiClient();
    // Use gemini-2.0-flash (available models: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash)
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    
    const prompt = buildQuizPrompt(text, numQuestions, questionTypes, notes);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    logger.info('Generated quiz content from Gemini');
    
    return parseQuizResponse(textResponse);
  } catch (error) {
    logger.error('Error generating quiz with Gemini:', error);
    throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

