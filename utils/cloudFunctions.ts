import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
// Use legacy API for compatibility - the new API uses File/Directory classes
import * as FileSystem from 'expo-file-system/legacy';
import { FileItem } from '@/components/buttons/fileUploadButton';
import { FileData, ProcessNotesRequest, ProcessNotesResponse } from '@/types';


/**
 * Call the processNotes Cloud Function
 */
export async function processNotes(
  request: ProcessNotesRequest
): Promise<ProcessNotesResponse> {
  try {
    // Get the Firebase app instance
    const app = getApp();
    
    // Initialize Functions with the app instance
    // For Firebase Functions v2, functions default to 'us-central1' region if not specified
    // If your function is deployed to a different region, specify it here: getFunctions(app, 'your-region')
    const functions = getFunctions(app, 'us-central1');
    
    const processNotesFunction = httpsCallable<ProcessNotesRequest, ProcessNotesResponse>(
      functions,
      'processNotes'
    );
    
    const result = await processNotesFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling processNotes function:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Handle Firebase Functions errors
    // Note: Error codes can be either 'functions/xxx' or just 'xxx' depending on Firebase version
    const errorCode = error.code || '';
    
    if (errorCode === 'functions/cancelled' || errorCode === 'cancelled') {
      throw new Error('Request was cancelled');
    } else if (errorCode === 'functions/unknown' || errorCode === 'unknown') {
      throw new Error('Unknown error occurred');
    } else if (errorCode === 'functions/invalid-argument' || errorCode === 'invalid-argument') {
      throw new Error(error.message || 'Invalid arguments provided');
    } else if (errorCode === 'functions/deadline-exceeded' || errorCode === 'deadline-exceeded') {
      throw new Error('Request took too long to complete');
    } else if (errorCode === 'functions/not-found' || errorCode === 'not-found') {
      throw new Error('Function not found. Please make sure it is deployed and the function name is correct. If using Firebase Functions v2, ensure the region is correct.');
    } else if (errorCode === 'functions/permission-denied' || errorCode === 'permission-denied') {
      throw new Error('Permission denied. Please make sure you are authenticated.');
    } else if (errorCode === 'functions/resource-exhausted' || errorCode === 'resource-exhausted') {
      throw new Error('Function resource exhausted. Please try again later.');
    } else if (errorCode === 'functions/failed-precondition' || errorCode === 'failed-precondition') {
      throw new Error('Failed precondition. Please try again.');
    } else if (errorCode === 'functions/aborted' || errorCode === 'aborted') {
      throw new Error('Request was aborted');
    } else if (errorCode === 'functions/out-of-range' || errorCode === 'out-of-range') {
      throw new Error('Request out of range');
    } else if (errorCode === 'functions/unimplemented' || errorCode === 'unimplemented') {
      throw new Error('Function not implemented');
    } else if (errorCode === 'functions/internal' || errorCode === 'internal') {
      throw new Error('Internal error: ' + (error.message || 'Unknown error'));
    } else if (errorCode === 'functions/unavailable' || errorCode === 'unavailable') {
      throw new Error('Function unavailable. Please try again later.');
    } else if (errorCode === 'functions/data-loss' || errorCode === 'data-loss') {
      throw new Error('Data loss error');
    } else if (errorCode === 'functions/unauthenticated' || errorCode === 'unauthenticated') {
      throw new Error('You must be authenticated to use this feature');
    } else {
      throw new Error(error.message || 'An unexpected error occurred. Error code: ' + errorCode);
    }
  }
}

/**
 * Process notes: Read files as base64 and call Cloud Function directly
 * Server handles upload, text extraction, AI processing, and Firestore updates
 */
export async function processNotesWithFiles(
  files: FileItem[],
  userId: string,
  selectionType: 'flashcard' | 'quiz',
  numberOfItems: number,
  quizQuestionTypes?: string[],
  notes?: string
): Promise<ProcessNotesResponse> {
  try {
    console.log(`Reading ${files.length} files as base64...`);
    
    // Read all files as base64 (this works fine in React Native)
    const filesData: FileData[] = await Promise.all(
      files.map(async (file) => {
        try {
          // Use 'base64' encoding string (expo-file-system legacy API supports this)
          const base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: 'base64' as any,
          });
          
          // Clean base64 string (remove data URL prefix if present)
          let cleanBase64 = base64.trim();
          if (cleanBase64.includes(',')) {
            cleanBase64 = cleanBase64.split(',')[1];
          }
          cleanBase64 = cleanBase64.replace(/\s/g, ''); // Remove any whitespace
          
          if (!cleanBase64 || cleanBase64.length === 0) {
            throw new Error(`File ${file.name} is empty or could not be read`);
          }
          
          console.log(`Successfully read ${file.name} (${cleanBase64.length} base64 chars)`);
          
          return {
            name: file.name,
            type: file.type,
            base64: cleanBase64,
          };
        } catch (readError) {
          console.error(`Error reading file ${file.name}:`, readError);
          throw new Error(`Failed to read file ${file.name}: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
        }
      })
    );
    
    console.log('All files read successfully. Calling Cloud Function...');
    
    // Call Cloud Function directly with file data
    // Server will handle: upload to Storage, text extraction, AI processing, Firestore updates
    const request: ProcessNotesRequest = {
      files: filesData,
      selectionType,
      numberOfItems,
      quizQuestionTypes,
      notes: notes?.trim() || undefined,
    };
    
    console.log('Calling processNotes Cloud Function...');
    const result = await processNotes(request);
    console.log('Cloud Function response received');
    
    return result;
  } catch (error) {
    console.error('Error in processNotesWithFiles:', error);
    throw error;
  }
}

