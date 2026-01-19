import { doc, getDoc, updateDoc, setDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { QuizData, FlashcardData } from '@/types';

/**
 * Save quiz data to Firestore (client-side)
 * Uses a transaction to prevent race conditions and duplicate saves
 */
export async function saveQuizToFirestore(
  db: Firestore,
  userId: string,
  quizData: Omit<QuizData, 'creationDate' | 'lastAccessed' | 'lastQuestionIndex' | 'bookmarkedQuestions'>
): Promise<QuizData> {
  const userRef = doc(db, 'users', userId);
  let savedQuiz: QuizData | null = null;
  
  try {
  
  // Use transaction to prevent race conditions
  // This ensures atomic read-and-write, preventing duplicate saves
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    // Create quiz object INSIDE transaction to ensure consistency
    // Use Timestamp.now() instead of serverTimestamp() because serverTimestamp() 
    // cannot be used inside arrays with updateDoc()
    const now = Timestamp.now();
    
    const quiz: QuizData = {
      ...quizData,
      creationDate: now,
      lastAccessed: now,
      lastQuestionIndex: 0,
      bookmarkedQuestions: [], // ALWAYS include this field
    };
    
    if (!userDoc.exists()) {
      // Document doesn't exist - create it
      transaction.set(userRef, {
        history: {
          flashcards: [],
          quizzes: [quiz],
        },
      });
      savedQuiz = quiz;
    } else {
      // Document exists - update it atomically
      const userData = userDoc.data();
      const existingQuizzes = userData?.history?.quizzes || [];
      
      // Check if this exact quiz already exists (prevent duplicates)
      // Compare by title and check for very recent quizzes (within 5 seconds)
      // This catches race conditions where both calls happen simultaneously
      const isDuplicate = existingQuizzes.some((existingQuiz: QuizData) => {
        // Check if quiz has the same title
        if (existingQuiz.title !== quiz.title) {
          return false;
        }
        
        // Check if timestamps are very close (within 5 seconds) - indicates duplicate save attempt
        const existingTime = existingQuiz.creationDate?.toMillis?.() || 
                             (existingQuiz.creationDate as any)?.seconds * 1000 ||
                             0;
        const newTime = quiz.creationDate.toMillis?.() || 
                        (quiz.creationDate as any)?.seconds * 1000 ||
                        0;
        const timeDiff = Math.abs(existingTime - newTime);
        
        // Also check if the quiz structure matches (same number of questions)
        const sameStructure = existingQuiz.questionsList?.length === quiz.questionsList?.length;
        
        return timeDiff < 5000 && sameStructure;
      });
      
      if (!isDuplicate) {
        transaction.update(userRef, {
          'history.quizzes': [...existingQuizzes, quiz],
        });
        savedQuiz = quiz;
      } else {
        console.warn('Duplicate quiz detected, skipping save:', quiz.title);
        // Return the existing quiz instead of the new one
        const duplicate = existingQuizzes.find((existingQuiz: QuizData) => {
          if (existingQuiz.title !== quiz.title) return false;
          const existingTime = existingQuiz.creationDate?.toMillis?.() || 
                               (existingQuiz.creationDate as any)?.seconds * 1000 ||
                               0;
          const newTime = quiz.creationDate.toMillis?.() || 
                          (quiz.creationDate as any)?.seconds * 1000 ||
                          0;
          const timeDiff = Math.abs(existingTime - newTime);
          return timeDiff < 5000;
        });
        savedQuiz = duplicate || quiz; // Fallback to new quiz if somehow not found
      }
    }
  });
  
    if (!savedQuiz) {
      throw new Error('Failed to save quiz: Transaction completed but no quiz was saved');
    }
    
    // Ensure bookmarkedQuestions exists (defensive check)
    const finalQuiz: QuizData = savedQuiz;
    if (!finalQuiz.bookmarkedQuestions) {
      console.warn('Quiz saved without bookmarkedQuestions, fixing...');
      finalQuiz.bookmarkedQuestions = [];
      // Update it back to Firestore
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const quizzes = userData?.history?.quizzes || [];
        const quizIndex = quizzes.findIndex((q: QuizData) => 
          q.title === finalQuiz.title && 
          Math.abs((q.creationDate?.toMillis?.() || 0) - (finalQuiz.creationDate?.toMillis?.() || 0)) < 1000
        );
        if (quizIndex >= 0) {
          const newQuizzes = [...quizzes];
          newQuizzes[quizIndex] = finalQuiz;
          await updateDoc(userRef, {
            'history.quizzes': newQuizzes,
          });
        }
      }
    }
    
    return finalQuiz;
  } catch (error) {
    console.error('Error saving quiz to Firestore:', error);
    throw new Error(`Failed to save quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save flashcard data to Firestore (client-side)
 * Uses a transaction to prevent race conditions and duplicate saves
 */
export async function saveFlashcardToFirestore(
  db: Firestore,
  userId: string,
  flashcardData: Omit<FlashcardData, 'creationDate' | 'lastReviewed'>
): Promise<FlashcardData> {
  const userRef = doc(db, 'users', userId);
  let savedFlashcard: FlashcardData | null = null;
  
  try {
  
  // Use transaction to prevent race conditions
  // This ensures atomic read-and-write, preventing duplicate saves
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    // Create flashcard object INSIDE transaction to ensure consistency
    // Use Timestamp.now() instead of serverTimestamp() because serverTimestamp() 
    // cannot be used inside arrays with updateDoc()
    const now = Timestamp.now();
    
    const flashcard: FlashcardData = {
      ...flashcardData,
      creationDate: now,
      lastReviewed: now,
    };
    
    if (!userDoc.exists()) {
      // Document doesn't exist - create it
      transaction.set(userRef, {
        history: {
          flashcards: [flashcard],
          quizzes: [],
        },
      });
      savedFlashcard = flashcard;
    } else {
      // Document exists - update it atomically
      const userData = userDoc.data();
      const existingFlashcards = userData?.history?.flashcards || [];
      
      // Check if this exact flashcard already exists (prevent duplicates)
      // Compare by title and check for very recent flashcards (within 5 seconds)
      // This catches race conditions where both calls happen simultaneously
      const isDuplicate = existingFlashcards.some((existingFlashcard: FlashcardData) => {
        // Check if flashcard has the same title
        if (existingFlashcard.title !== flashcard.title) {
          return false;
        }
        
        // Check if timestamps are very close (within 5 seconds) - indicates duplicate save attempt
        const existingTime = existingFlashcard.creationDate?.toMillis?.() || 
                             (existingFlashcard.creationDate as any)?.seconds * 1000 ||
                             0;
        const newTime = flashcard.creationDate.toMillis?.() || 
                        (flashcard.creationDate as any)?.seconds * 1000 ||
                        0;
        const timeDiff = Math.abs(existingTime - newTime);
        
        // Also check if the flashcard structure matches (same number of cards)
        const sameStructure = existingFlashcard.cards?.length === flashcard.cards?.length;
        
        return timeDiff < 5000 && sameStructure;
      });
      
      if (!isDuplicate) {
        transaction.update(userRef, {
          'history.flashcards': [...existingFlashcards, flashcard],
        });
        savedFlashcard = flashcard;
      } else {
        console.warn('Duplicate flashcard detected, skipping save:', flashcard.title);
        // Return the existing flashcard instead of the new one
        const duplicate = existingFlashcards.find((existingFlashcard: FlashcardData) => {
          if (existingFlashcard.title !== flashcard.title) return false;
          const existingTime = existingFlashcard.creationDate?.toMillis?.() || 
                               (existingFlashcard.creationDate as any)?.seconds * 1000 ||
                               0;
          const newTime = flashcard.creationDate.toMillis?.() || 
                          (flashcard.creationDate as any)?.seconds * 1000 ||
                          0;
          const timeDiff = Math.abs(existingTime - newTime);
          return timeDiff < 5000;
        });
        savedFlashcard = duplicate || flashcard; // Fallback to new flashcard if somehow not found
      }
    }
  });
  
    if (!savedFlashcard) {
      throw new Error('Failed to save flashcard: Transaction completed but no flashcard was saved');
    }
    
    return savedFlashcard;
  } catch (error) {
    console.error('Error saving flashcard to Firestore:', error);
    throw new Error(`Failed to save flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

