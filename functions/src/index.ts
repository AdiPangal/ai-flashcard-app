import * as functions from 'firebase-functions/v2/https';
import {setGlobalOptions} from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as fs from 'fs';
import {
  downloadFileFromStorage,
  deleteFileFromStorage,
  fileToBase64,
  cleanupTempFile,
  uploadFileFromBase64,
} from './services/storageService';
import {extractTextFromFile} from './services/documentAIService';
import {
  understandDiagram,
  generateFlashcards,
  generateQuiz,
} from './services/geminiService';
import {shouldUseDiagramUnderstanding} from './utils/diagramDetector';
import {
  ProcessNotesRequest,
  ProcessNotesResponse,
  ExtractedFileData,
} from './types';

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options for Cloud Functions
setGlobalOptions({
  maxInstances: 10,
});

/**
 * Main Cloud Function to process notes and generate flashcards/quizzes
 */
export const processNotes = functions.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 540, // 9 minutes (max for HTTP callable)
    memory: '512MiB',
  },
  async (request): Promise<ProcessNotesResponse> => {
    const auth = request.auth;
    
    if (!auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }
    
    const userId = auth.uid;
    logger.info(`Processing notes for user: ${userId}`);
    
    try {
      const data = request.data as ProcessNotesRequest;
      
      // Validate input
      if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
        throw new functions.HttpsError(
          'invalid-argument',
          'At least one file is required'
        );
      }
      
      if (!data.selectionType || !['flashcard', 'quiz'].includes(data.selectionType)) {
        throw new functions.HttpsError(
          'invalid-argument',
          'selectionType must be "flashcard" or "quiz"'
        );
      }
      
      if (!data.numberOfItems || data.numberOfItems <= 0) {
        throw new functions.HttpsError(
          'invalid-argument',
          'numberOfItems must be greater than 0'
        );
      }
      
      if (data.selectionType === 'quiz' && (!data.quizQuestionTypes || data.quizQuestionTypes.length === 0)) {
        throw new functions.HttpsError(
          'invalid-argument',
          'quizQuestionTypes is required for quiz type'
        );
      }
      
      // Validate file data
      for (const file of data.files) {
        if (!file.name || !file.type || !file.base64) {
          throw new functions.HttpsError(
            'invalid-argument',
            'Each file must have name, type, and base64 data'
          );
        }
        if (!['pdf', 'image'].includes(file.type)) {
          throw new functions.HttpsError(
            'invalid-argument',
            'File type must be "pdf" or "image"'
          );
        }
        // Validate base64 format (basic check)
        if (!/^[A-Za-z0-9+/=]+$/.test(file.base64.trim())) {
          throw new functions.HttpsError(
            'invalid-argument',
            'Invalid base64 data format'
          );
        }
        // Check file size (32MB Cloud Function limit, base64 increases size by ~33%)
        // So ~24MB original file = ~32MB base64
        const base64Size = file.base64.length;
        const estimatedOriginalSize = (base64Size * 3) / 4;
        if (estimatedOriginalSize > 24 * 1024 * 1024) { // 24MB
          throw new functions.HttpsError(
            'invalid-argument',
            `File ${file.name} is too large. Maximum size is 24MB.`
          );
        }
      }
      
      const files = data.files;
      const selectionType = data.selectionType;
      const numberOfItems = data.numberOfItems;
      const quizQuestionTypes = data.quizQuestionTypes || [];
      const notes = data.notes;
      
      logger.info(`Processing ${files.length} files for ${selectionType}`);
      
      // Validate Document AI configuration early (for PDFs)
      // Note: In Firebase Functions v2, use process.env or secrets (functions.config() is deprecated)
      const processorId = process.env.GCP_PROCESSOR_ID;
      const hasPdfFiles = files.some(f => f.type === 'pdf');
      
      if (hasPdfFiles && !processorId) {
        logger.error('Document AI processor ID not configured, but PDF files require it');
        logger.error('Please set GCP_PROCESSOR_ID as an environment variable or secret');
        throw new functions.HttpsError(
          'failed-precondition',
          'Document AI processor ID not configured. Please set GCP_PROCESSOR_ID environment variable or secret. Check Firebase Functions logs for details.'
        );
      }
      
      if (hasPdfFiles) {
        logger.info(`Document AI processor ID configured: ${processorId?.substring(0, 20)}...`);
      }
      
      // Step 1: Upload files to Storage (server-side)
      const uploadedFileUrls: string[] = [];
      
      for (const file of files) {
        try {
          logger.info(`Uploading file to Storage: ${file.name}`);
          const storageUrl = await uploadFileFromBase64(
            file.base64,
            file.name,
            file.type,
            userId
          );
          uploadedFileUrls.push(storageUrl);
          logger.info(`Successfully uploaded ${file.name} to Storage`);
        } catch (error) {
          logger.error(`Failed to upload file ${file.name}:`, error);
          throw new functions.HttpsError(
            'internal',
            `Failed to upload file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      
      // Step 2: Download files from Storage (for processing)
      const downloadedFiles: {
        filePath: string;
        fileName: string;
        mimeType: string;
        storageUrl: string;
      }[] = [];
      
      for (const storageUrl of uploadedFileUrls) {
        try {
          logger.info(`Downloading file from Storage: ${storageUrl}`);
          const downloaded = await downloadFileFromStorage(storageUrl);
          
          // Verify file was downloaded successfully
          if (!fs.existsSync(downloaded.filePath)) {
            throw new Error(`Downloaded file does not exist at path: ${downloaded.filePath}`);
          }
          
          const fileStats = fs.statSync(downloaded.filePath);
          logger.info(`File downloaded successfully: ${downloaded.fileName}`);
          logger.info(`File size: ${fileStats.size} bytes, MIME type: ${downloaded.mimeType}`);
          
          downloadedFiles.push({
            ...downloaded,
            storageUrl,
          });
        } catch (error) {
          logger.error(`Failed to download file ${storageUrl}:`, error);
          logger.error(`Error details: ${error instanceof Error ? error.stack : 'Unknown error'}`);
          throw new functions.HttpsError(
            'internal',
            `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      
      if (downloadedFiles.length === 0) {
        throw new functions.HttpsError(
          'internal',
          'No files were successfully downloaded from Storage'
        );
      }
      
      logger.info(`Successfully downloaded ${downloadedFiles.length} file(s) for processing`);
      
      // Step 3: Extract text from all files using Document AI
      const extractedFiles: ExtractedFileData[] = [];
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      
      for (const file of downloadedFiles) {
        try {
          const isImage = imageTypes.includes(file.mimeType.toLowerCase());
          const isPdf = file.mimeType === 'application/pdf';
          
          logger.info(`Extracting text from ${file.fileName}`);
          logger.info(`File path: ${file.filePath}`);
          logger.info(`File exists: ${fs.existsSync(file.filePath)}`);
          logger.info(`MIME type: ${file.mimeType}`);
          logger.info(`Is PDF: ${isPdf}, Is Image: ${isImage}`);
          
          // Verify file exists and has content
          if (!fs.existsSync(file.filePath)) {
            throw new Error(`File does not exist at path: ${file.filePath}`);
          }
          
          const fileStats = fs.statSync(file.filePath);
          if (fileStats.size === 0) {
            throw new Error(`File is empty: ${file.fileName}`);
          }
          
          logger.info(`File size: ${fileStats.size} bytes`);
          
          // For images, try Document AI first, but if it fails, we'll use diagram understanding
          // For PDFs, Document AI is required
          let textContent = '';
          try {
            textContent = await extractTextFromFile(file.filePath, file.mimeType);
            logger.info(`Document AI extracted ${textContent.length} characters from ${file.fileName}`);
            
            if (!textContent || textContent.trim().length === 0) {
              logger.warn(`Document AI returned empty text for ${file.fileName}`);
              if (isPdf) {
                // For PDFs, empty text is a problem - we'll try to handle it below
                throw new Error(`No text extracted from PDF ${file.fileName} - PDF may be image-only or corrupted`);
              }
            }
          } catch (extractError: any) {
            logger.error(`Document AI extraction failed for ${file.fileName}:`, extractError);
            
            if (isPdf) {
              // For PDFs, extraction failure is critical
              throw new Error(`Failed to extract text from PDF: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
            } else {
              // For images, extraction failure is okay - we'll use diagram understanding
              logger.info(`Document AI failed for image ${file.fileName}, will try diagram understanding instead`);
              textContent = '';
            }
          }
          
          extractedFiles.push({
            fileName: file.fileName,
            fileType: file.mimeType,
            textContent: textContent || '',
          });
          
        } catch (error) {
          logger.error(`Failed to process file ${file.fileName}:`, error);
          logger.error(`Error details: ${error instanceof Error ? error.stack : 'Unknown error'}`);
          
          // For PDFs, if extraction fails, we should fail the whole operation
          // For images, we can continue and try diagram understanding
          const isImage = imageTypes.includes(file.mimeType.toLowerCase());
          if (!isImage) {
            // PDF extraction failure is fatal
            throw new functions.HttpsError(
              'internal',
              `Failed to extract text from PDF file ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
          
          // For images, mark as failed but continue - we'll try diagram understanding
          extractedFiles.push({
            fileName: file.fileName,
            fileType: file.mimeType,
            textContent: '',
          });
        }
      }
      
      // Step 4: Process files - use extracted text or diagram understanding
      const allTexts: string[] = [];
      
      for (let i = 0; i < extractedFiles.length; i++) {
        const file = extractedFiles[i];
        const downloadedFile = downloadedFiles[i];
        const isImage = imageTypes.includes(file.fileType.toLowerCase());
        const isPdf = file.fileType === 'application/pdf';
        
        logger.info(`Processing file ${i + 1}/${extractedFiles.length}: ${file.fileName}`);
        logger.info(`Type: ${file.fileType}, Is image: ${isImage}, Is PDF: ${isPdf}`);
        logger.info(`Extracted text length: ${file.textContent.length}`);
        
        // For PDFs: use extracted text (should already be validated above)
        if (isPdf) {
          if (file.textContent && file.textContent.trim()) {
            logger.info(`Using extracted text for PDF ${file.fileName}: ${file.textContent.length} characters`);
            allTexts.push(file.textContent);
          } else {
            // This shouldn't happen as we throw error for PDF extraction failures above
            logger.error(`PDF ${file.fileName} has no extracted text - this is unexpected`);
            throw new functions.HttpsError(
              'internal',
              `No text could be extracted from PDF file ${file.fileName}. The PDF may be corrupted, password-protected, or contain only images.`
            );
          }
        }
        // For images: try diagram understanding if text extraction failed or minimal text
        else if (isImage) {
          // If we have substantial extracted text (>50 words), use it
          // Otherwise, try diagram understanding
          const shouldUseDiagram = shouldUseDiagramUnderstanding(file.fileType, file.textContent);
          
          if (shouldUseDiagram) {
            try {
              logger.info(`Attempting diagram understanding for image ${file.fileName}`);
              
              // Verify file exists
              if (!fs.existsSync(downloadedFile.filePath)) {
                throw new Error(`Image file not found at path: ${downloadedFile.filePath}`);
              }
              
              const fileStats = fs.statSync(downloadedFile.filePath);
              if (fileStats.size === 0) {
                throw new Error(`Image file is empty: ${file.fileName}`);
              }
              
              logger.info(`Image file size: ${fileStats.size} bytes`);
              
              const imageBase64 = fileToBase64(downloadedFile.filePath);
              logger.info(`Converted image to base64: ${imageBase64.length} characters`);
              
              if (!imageBase64 || imageBase64.length === 0) {
                throw new Error(`Failed to convert image to base64`);
              }
              
              const diagramDescription = await understandDiagram(
                imageBase64,
                file.fileType
              );
              
              if (diagramDescription && diagramDescription.trim()) {
                file.isDiagram = true;
                file.diagramDescription = diagramDescription;
                allTexts.push(diagramDescription);
                logger.info(`Generated diagram description: ${diagramDescription.length} characters`);
              } else {
                logger.warn(`Diagram understanding returned empty result for ${file.fileName}`);
                // Fall back to extracted text if available
                if (file.textContent && file.textContent.trim()) {
                  logger.info(`Using extracted text as fallback: ${file.textContent.length} characters`);
                  allTexts.push(file.textContent);
                }
              }
            } catch (error) {
              logger.error(`Failed to process diagram for ${file.fileName}:`, error);
              logger.error(`Error details: ${error instanceof Error ? error.stack : 'Unknown error'}`);
              
              // Fall back to extracted text if diagram processing fails
              if (file.textContent && file.textContent.trim()) {
                logger.info(`Using extracted text as fallback after diagram failure: ${file.textContent.length} characters`);
                allTexts.push(file.textContent);
              } else {
                logger.warn(`No text available for ${file.fileName} - both extraction and diagram understanding failed`);
              }
            }
          } else {
            // Use extracted text directly (has substantial content)
            if (file.textContent && file.textContent.trim()) {
              logger.info(`Using extracted text for image ${file.fileName}: ${file.textContent.length} characters`);
              allTexts.push(file.textContent);
            }
          }
        }
        // Unknown file type - try to use extracted text
        else {
          if (file.textContent && file.textContent.trim()) {
            logger.info(`Using extracted text for ${file.fileName}: ${file.textContent.length} characters`);
            allTexts.push(file.textContent);
          } else {
            logger.warn(`No text extracted from ${file.fileName} (file type: ${file.fileType})`);
          }
        }
      }
      
      // Combine all text
      const combinedText = allTexts.join('\n\n');
      
      if (!combinedText.trim()) {
        throw new functions.HttpsError(
          'invalid-argument',
          'No text could be extracted from the provided files'
        );
      }
      
      logger.info(`Combined text length: ${combinedText.length} characters`);
      
      // Step 5: Generate flashcards or quiz
      let result;
      
      if (selectionType === 'flashcard') {
        logger.info(`Generating ${numberOfItems} flashcards`);
        const geminiResponse = await generateFlashcards(
          combinedText,
          numberOfItems,
          notes
        );
        logger.info('Gemini flashcard response generated');
        result = geminiResponse; // Return raw response
      } else {
        logger.info(`Generating ${numberOfItems} quiz questions`);
        const geminiResponse = await generateQuiz(
          combinedText,
          numberOfItems,
          quizQuestionTypes,
          notes
        );
        logger.info('Gemini quiz response generated', { 
          title: geminiResponse.title,
          questionsCount: geminiResponse.questionsList?.length || 0
        });
        result = geminiResponse; // Return raw response
      }
      
      // Step 5: Clean up downloaded files and delete from Storage
      for (const file of downloadedFiles) {
        try {
          cleanupTempFile(file.filePath);
          await deleteFileFromStorage(file.storageUrl);
        } catch (error) {
          logger.error(`Failed to clean up file ${file.fileName}:`, error);
          // Don't throw - cleanup failures shouldn't fail the operation
        }
      }
      
      logger.info(`Successfully processed notes for user: ${userId}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('Error processing notes:', error);
      
      if (error instanceof functions.HttpsError) {
        throw error;
      }
      
      throw new functions.HttpsError(
        'internal',
        `Failed to process notes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

