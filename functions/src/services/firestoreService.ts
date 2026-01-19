import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {FlashcardData} from '../types';


/**
 * Save flashcard data to Firestore
 */
export async function saveFlashcardToFirestore(
  userId: string,
  flashcardData: Omit<FlashcardData, 'creationDate' | 'lastReviewed'>
): Promise<FlashcardData> {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const flashcard: FlashcardData = {
      ...flashcardData,
      creationDate: now,
      lastReviewed: now,
    };
    
    const userRef = admin.firestore().doc(`users/${userId}`);
    
    // Check if document exists and has the history structure
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Document doesn't exist - create it with proper structure
      logger.info(`User document doesn't exist, creating it for user: ${userId}`);
      await userRef.set({
        history: {
          flashcards: [flashcard],
          quizzes: [],
        },
      }, { merge: true });
    } else {
      // Document exists - check if history.flashcards exists
      const userData = userDoc.data();
      if (!userData?.history) {
        // History structure doesn't exist - initialize it
        logger.info(`History structure missing, initializing for user: ${userId}`);
        await userRef.update({
          'history.flashcards': [flashcard],
          'history.quizzes': [],
        });
      } else if (!userData.history.flashcards) {
        // History exists but flashcards array doesn't - initialize it
        logger.info(`History.flashcards missing, initializing for user: ${userId}`);
        await userRef.update({
          'history.flashcards': [flashcard],
        });
      } else {
        // Normal case - use arrayUnion to add flashcard
    await userRef.update({
      'history.flashcards': admin.firestore.FieldValue.arrayUnion(flashcard),
    });
      }
    }
    
    logger.info(`Saved flashcard to Firestore for user: ${userId}`);
    
    return flashcard;
  } catch (error) {
    logger.error('Error saving flashcard to Firestore:', error);
    throw new Error(`Failed to save flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

