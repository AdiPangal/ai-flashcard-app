import {DocumentProcessorServiceClient} from '@google-cloud/documentai';
import * as logger from 'firebase-functions/logger';
import * as functions from 'firebase-functions';
import * as fs from 'fs';
import * as path from 'path';
import {splitPdfIntoChunks, cleanupPdfChunks, getPdfPageCount} from '../utils/pdfSplitter';

let client: DocumentProcessorServiceClient | null = null;

/**
 * Initialize Document AI client
 */
function getDocumentAIClient(): DocumentProcessorServiceClient {
  if (client) {
    return client;
  }
  
  // In Firebase Functions v2, use process.env directly (functions.config() is deprecated)
  const projectId = process.env.GCP_PROJECT_ID;
  
  // Try to use service account from config file
  // The config file is in the project root: config/ai-flashcard-app-bbe15-09b6cb11ebfb.json
  // From functions/src/services/, we need to go up 3 levels: ../../../
  const serviceAccountPath = path.join(__dirname, '../../../config/ai-flashcard-app-bbe15-09b6cb11ebfb.json');
  
  try {
    if (fs.existsSync(serviceAccountPath)) {
      client = new DocumentProcessorServiceClient({
        keyFilename: serviceAccountPath,
        projectId: projectId,
      });
      logger.info('Document AI client initialized with service account file');
    } else {
      // Use default credentials (works if deployed with default service account)
      client = new DocumentProcessorServiceClient({
        projectId: projectId,
      });
      logger.info('Document AI client initialized with default credentials');
    }
  } catch (error) {
    logger.error('Error initializing Document AI client:', error);
    // Try without service account path as fallback
    try {
      client = new DocumentProcessorServiceClient({
        projectId: projectId,
      });
      logger.info('Document AI client initialized with default credentials (fallback)');
    } catch (fallbackError) {
      logger.error('Failed to initialize Document AI client with fallback:', fallbackError);
      throw new Error('Failed to initialize Document AI client');
    }
  }
  
  return client;
}

/**
 * Process a single PDF chunk with Document AI
 */
async function processPdfChunk(
  chunkPath: string,
  processorId: string,
  location: string,
  projectId: string
): Promise<string> {
  const client = getDocumentAIClient();
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  
  const pdfBytes = fs.readFileSync(chunkPath);
  
  const request: any = {
    name: name,
    rawDocument: {
      content: pdfBytes,
      mimeType: 'application/pdf',
    },
    processOptions: {
      ocrConfig: {
        enableNativePdfParsing: true,
      },
    },
  };
  
  const [result] = await client.processDocument(request);
  const document = result.document;
  
  if (!document?.text) {
    logger.warn(`No text extracted from chunk: ${chunkPath}`);
    return '';
  }
  
  return document.text;
}

/**
 * Process a file (PDF or image) with Document AI OCR
 * For large PDFs (>30 pages), automatically splits into chunks and processes each chunk
 */
export async function extractTextFromFile(
  filePath: string,
  mimeType: string
): Promise<string> {
  // In Firebase Functions v2, use process.env directly (functions.config() is deprecated)
  const processorId = process.env.GCP_PROCESSOR_ID;
  const location = process.env.GCP_LOCATION || 'us';
  const projectId = process.env.GCP_PROJECT_ID;
  
  if (!processorId) {
    throw new Error('Document AI processor ID not configured');
  }
  
  // Ensure required variables are defined for TypeScript
  const validatedProcessorId: string = processorId;
  const validatedLocation: string = location;
  const validatedProjectId: string = projectId || '';
  
  const isPDF = mimeType === 'application/pdf';
  const tempDir = '/tmp';
  const pdfChunkPaths: string[] = [];
  
  try {
    // For PDFs, check if splitting is needed
    // Document AI limits: 15 pages (non-imageless) or 30 pages (imageless mode if enabled on processor)
    // We split at 15 pages to ensure compatibility with non-imageless mode
    if (isPDF) {
      const pageCount = await getPdfPageCount(filePath);
      logger.info(`PDF has ${pageCount} pages`);
      
      if (pageCount > 15) {
        // Split PDF into chunks (max 15 pages per chunk for compatibility)
        logger.info(`PDF exceeds 15 pages, splitting into chunks...`);
        const chunks = await splitPdfIntoChunks(filePath, tempDir);
        pdfChunkPaths.push(...chunks.filter((chunk) => chunk !== filePath));
        
        // Process each chunk and combine results
        const extractedTexts: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkPath = chunks[i];
          logger.info(`Processing chunk ${i + 1}/${chunks.length}: ${path.basename(chunkPath)}`);
          
          try {
            const chunkText = await processPdfChunk(chunkPath, validatedProcessorId, validatedLocation, validatedProjectId);
            extractedTexts.push(chunkText);
            logger.info(`Chunk ${i + 1}: Extracted ${chunkText.length} characters`);
          } catch (chunkError: any) {
            logger.error(`Error processing chunk ${i + 1}:`, chunkError);
            // Continue with other chunks even if one fails
            if (chunkError.code === 3 && chunkError.message?.includes('page') && chunkError.message?.includes('limit')) {
              throw new Error(`Chunk ${i + 1} still exceeds page limit. This shouldn't happen after splitting.`);
            }
          }
        }
        
        // Combine all extracted texts
        const combinedText = extractedTexts.join('\n\n--- Chunk separator ---\n\n');
        logger.info(`Combined text from ${chunks.length} chunks: ${combinedText.length} characters`);
        
        // Cleanup chunks
        cleanupPdfChunks(pdfChunkPaths);
        
        return combinedText;
      }
    }
    
    // For images or PDFs within limits, process normally
    const client = getDocumentAIClient();
    const name = `projects/${validatedProjectId}/locations/${validatedLocation}/processors/${validatedProcessorId}`;
    
    const fileBytes = fs.readFileSync(filePath);
    
    const request: any = {
      name: name,
      rawDocument: {
        content: fileBytes,
        mimeType: mimeType,
      },
    };
    
    if (isPDF) {
      request.processOptions = {
        ocrConfig: {
          enableNativePdfParsing: true,
        },
      };
    }
    
    const [result] = await client.processDocument(request);
    const document = result.document;
    
    if (!document?.text) {
      logger.warn('No text extracted from document');
      return '';
    }
    
    const extractedText = document.text;
    logger.info(`Extracted ${extractedText.length} characters from document`);
    
    return extractedText;
  } catch (error: any) {
    logger.error('Error extracting text with Document AI:', error);
    
    // Cleanup chunks on error
    if (pdfChunkPaths.length > 0) {
      cleanupPdfChunks(pdfChunkPaths);
    }
    
    // Handle page limit errors
    if (error.code === 3 && error.message?.includes('page') && error.message?.includes('limit')) {
      // If we haven't tried splitting yet (shouldn't happen since we check page count first), try it now as fallback
      if (isPDF && pdfChunkPaths.length === 0) {
        logger.info('Retrying with PDF splitting due to page limit error...');
        try {
            const pageCount = await getPdfPageCount(filePath);
            if (pageCount > 15) {
              const chunks = await splitPdfIntoChunks(filePath, tempDir);
              const extractedTexts: string[] = [];
              for (let i = 0; i < chunks.length; i++) {
                const chunkText = await processPdfChunk(chunks[i], validatedProcessorId, validatedLocation, validatedProjectId);
                extractedTexts.push(chunkText);
              }
            const combinedText = extractedTexts.join('\n\n--- Chunk separator ---\n\n');
            cleanupPdfChunks(chunks.filter((chunk) => chunk !== filePath));
            return combinedText;
          }
        } catch (retryError) {
          logger.error('Retry with splitting failed:', retryError);
          // If retry fails, throw original error
        }
      }
      const errorMsg = `PDF exceeds Document AI page limit. Original error: ${error.message}`;
      logger.warn(errorMsg);
      throw new Error(errorMsg);
    }
    
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

