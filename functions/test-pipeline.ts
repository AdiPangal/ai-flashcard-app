/**
 * Test script to run the AI pipeline on test PDFs
 * 
 * Usage:
 *   cd functions
 *   npm install
 *   npm run test
 * 
 * Make sure you have set environment variables:
 *   GCP_PROJECT_ID
 *   GCP_PROCESSOR_ID
 *   GCP_LOCATION
 *   GEMINI_API_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {buildFlashcardPrompt, buildQuizPrompt} from './src/utils/promptBuilder';
import {parseFlashcardResponse, parseQuizResponse} from './src/utils/jsonParser';
import {shouldUseDiagramUnderstanding} from './src/utils/diagramDetector';
import {transformFlashcardData, transformQuizData} from './src/utils/dataTransformer';
import {extractTextFromFile} from './src/services/documentAIService';
import {getPdfPageCount} from './src/utils/pdfSplitter';

// Try to load .env file if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed, that's okay
}

// Initialize Firebase Admin SDK for local testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCP_PROJECT_ID || 'ai-flashcard-app-bbe15',
  });
}

// Configuration
const TEST_PDFS_DIR = path.join(__dirname, '../app/test_examples');
const OUTPUT_DIR = path.join(__dirname, './test-outputs');

// Initialize Gemini client
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Extract text from PDF using Document AI (with automatic splitting for large PDFs)
async function extractTextFromPDF(filePath: string): Promise<string> {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);
  
  // Check PDF page count
  try {
    const pageCount = await getPdfPageCount(filePath);
    console.log(`   📊 PDF has ${pageCount} pages`);
    if (pageCount > 30) {
      const numChunks = Math.ceil(pageCount / 30);
      console.log(`   🔀 Will split into ${numChunks} chunk(s) for processing`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not determine page count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('   Extracting text with Document AI...');
  
  // Use the service function which handles splitting automatically
  const extractedText = await extractTextFromFile(filePath, 'application/pdf');
  
  const wordCount = extractedText.trim().split(/\s+/).length;
  console.log(`   ✅ Extracted ${extractedText.length} characters (${wordCount} words)`);
  
  return extractedText;
}

// Generate flashcards using Gemini
async function generateFlashcards(text: string, numCards: number, notes?: string): Promise<any> {
  console.log(`   Generating ${numCards} flashcards with Gemini Pro...`);
  
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
  
  console.log('   ✅ Received response from Gemini');
  
  return parseFlashcardResponse(textResponse);
}

// Generate quiz questions using Gemini
async function generateQuiz(text: string, numQuestions: number, questionTypes: string[] = ['multiple-choice'], notes?: string): Promise<any> {
  console.log(`   Generating ${numQuestions} quiz questions with Gemini Pro...`);
  
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
  
  const prompt = buildQuizPrompt(text, numQuestions, questionTypes, notes);
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const textResponse = response.text();
  
  console.log('   ✅ Received response from Gemini');
  
  return parseQuizResponse(textResponse);
}

// Save output to file
function saveOutput(fileName: string, data: any, stage: string): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
  }
  
  const baseName = path.basename(fileName, path.extname(fileName));
  const outputPath = path.join(OUTPUT_DIR, `${baseName}_${stage}.json`);
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`   💾 Saved ${stage} to: ${outputPath}`);
}

// Main test function
async function testPipeline() {
  console.log('🧪 AI Pipeline Test Script');
  console.log('==========================\n');
  
  // Check environment variables
  console.log('📋 Configuration:');
  console.log(`   GCP Project: ${process.env.GCP_PROJECT_ID || 'ai-flashcard-app-bbe15'}`);
  console.log(`   GCP Processor: ${process.env.GCP_PROCESSOR_ID || '3b62aeb4bb65cf38'}`);
  console.log(`   GCP Location: ${process.env.GCP_LOCATION || 'us'}`);
  console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Service Account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '../config/ai-flashcard-app-bbe15-09b6cb11ebfb.json'}`);
  console.log('');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  // Check if we should skip Document AI (for testing Gemini only)
  const skipDocumentAI = process.env.SKIP_DOCUMENT_AI === 'true';
  if (skipDocumentAI) {
    console.log('⚠️  SKIP_DOCUMENT_AI=true - Will skip Document AI and use mock text\n');
  }
  
  // Get all PDF files
  const files = fs.readdirSync(TEST_PDFS_DIR)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(TEST_PDFS_DIR, file));
  
  if (files.length === 0) {
    console.error('❌ No PDF files found in test_examples folder');
    process.exit(1);
  }
  
  console.log(`📁 Found ${files.length} PDF file(s):`);
  files.forEach(file => console.log(`   - ${path.basename(file)}`));
  console.log('');
  
  // Process each PDF
  const results: {
    fileName: string;
    extractedText: string;
    flashcardResponse: any;
    flashcardTransformed: any;
    quizResponse: any;
    quizTransformed: any;
    errors: string[];
  }[] = [];
  
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const errors: string[] = [];
    
    try {
      // Step 1: Extract text
      let extractedText = '';
      
      if (skipDocumentAI) {
        // Use mock text for testing Gemini pipeline only
        console.log('   ⚠️  Using mock text (Document AI skipped)');
        extractedText = `This is sample text extracted from ${fileName}. 
        
        Key Concepts:
        - Concept A: This is an important concept related to the topic
        - Concept B: Another important concept that builds on Concept A
        - Concept C: A related concept that helps understand the overall topic
        
        Detailed Information:
        Concept A involves several important principles. These principles are fundamental to understanding the broader topic. 
        Concept B expands on Concept A by introducing additional complexity and considerations.
        Concept C ties everything together and provides practical applications.
        
        Summary:
        These concepts work together to form a comprehensive understanding of the subject matter.`;
        console.log(`   ✅ Using ${extractedText.length} characters of mock text`);
      } else {
        try {
          extractedText = await extractTextFromPDF(filePath);
        } catch (error: any) {
          // Handle page limit errors
          if (error.message?.includes('page') && error.message?.includes('limit')) {
            errors.push(error.message);
            console.log(`   ⚠️  ${error.message}`);
            console.log(`   💡 For large PDFs (>30 pages), consider splitting them or using batch processing`);
            
            // For testing, we can skip or use a fallback
            // In production, we should inform the user about the limitation
            results.push({
              fileName,
              extractedText: '',
              flashcardResponse: null,
              flashcardTransformed: null,
              quizResponse: null,
              quizTransformed: null,
              errors,
            });
            continue;
          }
          throw error;
        }
      }
      
      saveOutput(fileName, {text: extractedText, length: extractedText.length}, 'extracted_text');
      
      if (!extractedText.trim()) {
        errors.push('No text could be extracted from PDF');
        results.push({
          fileName,
          extractedText: '',
          flashcardResponse: null,
          flashcardTransformed: null,
          quizResponse: null,
          quizTransformed: null,
          errors,
        });
        continue;
      }
      
      // Step 2: Check if diagram understanding is needed (for PDFs, usually not)
      const mimeType = 'application/pdf';
      const needsDiagramUnderstanding = shouldUseDiagramUnderstanding(mimeType, extractedText);
      console.log(`   📊 Diagram understanding needed: ${needsDiagramUnderstanding ? 'Yes' : 'No'}`);
      
      // Step 3: Generate 10 flashcards
      const numCards = 10;
      console.log(`\n   🎴 Generating ${numCards} flashcards...`);
      const flashcardResponse = await generateFlashcards(extractedText, numCards);
      saveOutput(fileName, flashcardResponse, 'flashcards_gemini_response');
      console.log(`   ✅ Generated ${flashcardResponse.cards?.length || 0} flashcards`);
      
      // Step 4: Transform flashcard data to Firestore format
      const flashcardTransformed = transformFlashcardData(flashcardResponse);
      saveOutput(fileName, flashcardTransformed, 'flashcards_firestore_format');
      console.log(`   ✅ Transformed flashcards to Firestore format`);
      
      // Step 5: Generate 10 quiz questions (multiple-choice only for this test)
      const numQuestions = 10;
      console.log(`\n   📝 Generating ${numQuestions} quiz questions...`);
      const quizResponse = await generateQuiz(extractedText, numQuestions, ['multiple-choice']);
      saveOutput(fileName, quizResponse, 'quiz_gemini_response');
      console.log(`   ✅ Generated ${quizResponse.questionsList?.length || 0} quiz questions`);
      
      // Step 6: Transform quiz data to Firestore format
      const quizTransformed = transformQuizData(quizResponse);
      saveOutput(fileName, quizTransformed, 'quiz_firestore_format');
      console.log(`   ✅ Transformed quiz to Firestore format`);
      
      // Display summary
      console.log(`\n   📝 Summary:`);
      console.log(`      Flashcards:`);
      console.log(`         Title: ${flashcardTransformed.title}`);
      console.log(`         Tags: ${flashcardTransformed.tags.join(', ') || 'None'}`);
      console.log(`         Cards: ${flashcardTransformed.cards.length}`);
      if (flashcardTransformed.cards[0]?.question) {
        console.log(`         First Question: ${flashcardTransformed.cards[0].question.substring(0, 60)}...`);
      }
      console.log(`      Quiz:`);
      console.log(`         Title: ${quizTransformed.title}`);
      console.log(`         Tags: ${quizTransformed.tags.join(', ') || 'None'}`);
      console.log(`         Questions: ${quizTransformed.questionsList.length}`);
      if (quizTransformed.questionsList[0]?.question) {
        console.log(`         First Question: ${quizTransformed.questionsList[0].question.substring(0, 60)}...`);
      }
      
      results.push({
        fileName,
        extractedText,
        flashcardResponse,
        flashcardTransformed,
        quizResponse,
        quizTransformed,
        errors,
      });
      
    } catch (error) {
      console.error(`\n   ❌ Error processing ${fileName}:`, error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      results.push({
        fileName,
        extractedText: '',
        flashcardResponse: null,
        flashcardTransformed: null,
        quizResponse: null,
        quizTransformed: null,
        errors,
      });
    }
    
    console.log('\n' + '─'.repeat(60) + '\n');
  }
  
  // Final summary
  console.log('📊 Test Summary');
  console.log('===============');
  results.forEach(result => {
    console.log(`\n${result.fileName}:`);
    if (result.errors.length > 0) {
      console.log(`   ❌ Errors: ${result.errors.join(', ')}`);
    } else {
      console.log(`   ✅ Success`);
      console.log(`   📄 Text Length: ${result.extractedText.length} chars`);
      console.log(`   🎴 Flashcards: ${result.flashcardTransformed?.cards?.length || 0}`);
      console.log(`   📝 Quiz Questions: ${result.quizTransformed?.questionsList?.length || 0}`);
    }
  });
  
  // Save full results summary (without full data to keep file size manageable)
  saveOutput('all_results', {
    summary: {
      total: results.length,
      successful: results.filter(r => r.errors.length === 0).length,
      failed: results.filter(r => r.errors.length > 0).length,
    },
    results: results.map(r => ({
      fileName: r.fileName,
      success: r.errors.length === 0,
      extractedTextLength: r.extractedText.length,
      flashcardCount: r.flashcardTransformed?.cards?.length || 0,
      flashcardTitle: r.flashcardTransformed?.title || 'N/A',
      quizCount: r.quizTransformed?.questionsList?.length || 0,
      quizTitle: r.quizTransformed?.title || 'N/A',
      errors: r.errors,
    })),
  }, 'full_results_summary');
  
  console.log(`\n✅ Test complete!`);
  console.log(`   📊 Total Files: ${results.length}`);
  console.log(`   ✅ Successful: ${results.filter(r => r.errors.length === 0).length}`);
  console.log(`   ❌ Failed: ${results.filter(r => r.errors.length > 0).length}`);
  console.log(`   📁 Check ${OUTPUT_DIR} for detailed outputs.\n`);
}

// Run the test
testPipeline().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

