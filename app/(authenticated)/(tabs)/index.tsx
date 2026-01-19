import { useEffect, useState, useRef, useCallback } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Modal} from "react-native";
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

import SelectionButton from "@/components/buttons/selectionButton";
import FileUploadButton, { FileItem } from "@/components/buttons/fileUploadButton";
import FileList from "@/components/fileList";
import MultilineInput from "@/components/userInput/multilineInput";
import QuizQuestionTypes from "@/components/quizQuestionTypes";
import HorizontalLine from "@/components/horizontalLine";
import NumericalInput from "@/components/userInput/numericalInput";
import AuthenticationButton from "@/components/buttons/authenticationButton";
import ProcessingLoader from "@/components/processingLoader";
import { prepareSubmissionData } from "@/utils/submissionHandler";
import { processNotesWithFiles } from "@/utils/cloudFunctions";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { saveQuizToFirestore, saveFlashcardToFirestore } from "@/utils/firestoreHelpers";
import { transformQuizData, transformFlashcardData } from "@/utils/dataTransformer";
import { GeminiQuizResponse, GeminiFlashcardResponse } from "@/types";
import { getTabBarPadding } from "@/utils/tabBarHelpers";

export default function HomeScreen(){
    const router = useRouter();
    const { userId, db } = useAuth();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [selectionType, setSelectionType] = useState<"flashcard" | "quiz">("flashcard");
    const [files, setFiles] = useState<FileItem[]>([]);
    const [numberOfItems, setNumberOfItems] = useState<string>("10");
    const [quizQuestionTypes, setQuizQuestionTypes] = useState<string[]>([]);
    const [notes, setNotes] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const isSavingRef = useRef(false);
    
    // Animation for quiz question types fade in/out
    const quizContentOpacity = useSharedValue(0);

    useEffect(() => {
        async function fetchUserPreferences() {
            if (userId && db) {
                const userRef = doc(db, 'users', userId);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()){
                    const userQuestions = userDoc.data()?.preferences?.defaultQuestionCount || 10;
                    if (userQuestions) {
                        setNumberOfItems(userQuestions.toString());
                    }
                }
            }
        }
        fetchUserPreferences();
    }, [userId, db]);
    
    useEffect(() => {
        if (selectionType === "quiz") {
            quizContentOpacity.value = withTiming(1, { duration: 300 });
        } else {
            quizContentOpacity.value = withTiming(0, { duration: 300 });
        }
    }, [selectionType]);
    
    const animatedQuizStyle = useAnimatedStyle(() => {
        const isVisible = quizContentOpacity.value > 0.1;
        return {
            opacity: quizContentOpacity.value,
            maxHeight: isVisible ? 500 : 0,
            overflow: 'hidden' as const,
        };
    });
    
    const handleFileUpload = (newFiles: FileItem[]) => {
        setFiles([...files, ...newFiles]);
    };
    
    const handleDeleteFile = (id: string) => {
        setFiles(files.filter(file => file.id !== id));
    };
    
    const handleToggleQuestionType = (type: string) => {
        if (quizQuestionTypes.includes(type)) {
            setQuizQuestionTypes(quizQuestionTypes.filter(t => t !== type));
        } else {
            setQuizQuestionTypes([...quizQuestionTypes, type]);
        }
    };

    const handleSelectFlashcard = useCallback(() => {
        setSelectionType("flashcard");
    }, []);
    
    const handleSelectQuiz = useCallback(() => {
        setSelectionType("quiz");
    }, []);
    
    const handleCreate = async () => {
        // Prevent duplicate calls (e.g., from React StrictMode in development or rapid clicks)
        if (isSavingRef.current) {
            console.log('⚠️ handleCreate: Save already in progress, ignoring duplicate call');
            return;
        }
        
        if (!userId) {
            Alert.alert('Error', 'You must be logged in to create flashcards or quizzes');
            return;
        }
        
        // Set the guard
        isSavingRef.current = true;
        setLoading(true);
        
        const numItems = parseInt(numberOfItems, 10);
        
        const { data, errors } = prepareSubmissionData(
            selectionType,
            files,
            numItems,
            selectionType === 'quiz' ? quizQuestionTypes : undefined,
            notes
        );
        
        if (errors.length > 0) {
            setLoading(false);
            isSavingRef.current = false;
            const errorMessages = errors.map(e => e.message).join('\n');
            Alert.alert('Validation Error', errorMessages);
            return;
        }
        
        if (!data) {
            setLoading(false);
            isSavingRef.current = false;
            return;
        }
        
        try {
            // Process files with Cloud Function (server handles everything)
            const result = await processNotesWithFiles(
                files,
                userId,
                selectionType,
                numItems,
                selectionType === 'quiz' ? quizQuestionTypes : undefined,
                notes
            );
            
            if (result.success && result.data) {
                // Reset form after successful submission
                setFiles([]);
                setNumberOfItems("10");
                setQuizQuestionTypes([]);
                setNotes("");
                
                try {
                    if (selectionType === 'quiz' && userId && db) {
                        console.log('saving quiz')
                        // Transform and save quiz on client side
                        const geminiResponse = result.data as GeminiQuizResponse;
                        const transformed = transformQuizData(geminiResponse);

                        //console.log('transformed', transformed);
                        await saveQuizToFirestore(db, userId, transformed);
                        console.log('quiz saved');
                        // TODO: Navigate directory to quizHome while saving the quiz to firestore
                        // Get the quiz index after saving
                        const userRef = doc(db, 'users', userId);
                        const userDoc = await getDoc(userRef);
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            console.log('userData', userData);
                            const quizzes = userData.history?.quizzes || [];
                            const quizIndex = quizzes.length - 1;
                            // Navigate to quizHome (loading will be reset when component unmounts)
                            router.push({
                                pathname: '/(authenticated)/(quizFlow)/quizHome',
                                params: { quizIndex: quizIndex.toString() }
                            });
                            setLoading(false);
                            isSavingRef.current = false;
                        } else {
                            setLoading(false);
                            isSavingRef.current = false;
                            router.push('/(authenticated)/(tabs)/history');
                        }
                    } else if (selectionType === 'flashcard' && userId && db) {
                        // Transform and save flashcard on client side
                        const geminiResponse = result.data as GeminiFlashcardResponse;
                        const transformed = transformFlashcardData(geminiResponse);
                        await saveFlashcardToFirestore(db, userId, transformed);
                        
                        // Get the flashcard index after saving
                        const userRef = doc(db, 'users', userId);
                        const userDoc = await getDoc(userRef);
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            const flashcards = userData.history?.flashcards || [];
                            const flashcardIndex = flashcards.length - 1;
                            // Navigate to flashcardHome (loading will be reset when component unmounts)
                            router.push({
                                pathname: '/(authenticated)/(flashcardFlow)/flashcardHome',
                                params: { flashcardIndex: flashcardIndex.toString() }
                            });
                            setLoading(false);
                            isSavingRef.current = false;
                        } else {
                            setLoading(false);
                            isSavingRef.current = false;
                            router.push('/(authenticated)/(tabs)/history');
                        }
                    }
                } catch (saveError) {
                    console.error('Error saving to Firestore:', saveError);
                    Alert.alert(
                        'Error',
                        `Failed to save ${selectionType === 'quiz' ? 'quiz' : 'flashcard'}. Please try again.`
                    );
                }
            } else {
                Alert.alert('Error', result.error || 'Failed to create flashcards/quiz. Please try again.');
            }
        } catch (error) {
            console.error('Error processing notes:', error);
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to process your files. Please try again.'
            );
        } finally {
            // Always reset the guard and loading state
            setLoading(false);
            isSavingRef.current = false;
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.mainContainer, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.textContainer}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Home</Text>
            </View>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: getTabBarPadding(insets.bottom) }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.selectionContainer}>
                
                    <SelectionButton
                        title="Flashcards"
                        selected={selectionType === "flashcard"}
                        onPress={handleSelectFlashcard}
                        activeIcon="albums"
                        inactiveIcon="albums-outline"
                    />
                    <View style={styles.selectionGap} />
                    <SelectionButton
                        title="Quiz"
                        selected={selectionType === "quiz"}
                        onPress={handleSelectQuiz}
                        activeIcon="document-text"
                        inactiveIcon="document-text-outline"
                    />
                </View>
                
                <HorizontalLine />
                
                <FileUploadButton
                    onFilesSelected={handleFileUpload}
                    fileCount={files.length}
                />
                
                <FileList
                    files={files}
                    onDelete={handleDeleteFile}
                />
                <HorizontalLine />
                <NumericalInput
                    title={selectionType === "flashcard" ? "Number of Flashcards" : "Number of Questions"}
                    value={numberOfItems}
                    onChangeText={setNumberOfItems}
                    placeholder="10"
                    keyboardType="numeric"
                />
                <HorizontalLine />
                
                <Animated.View style={animatedQuizStyle}>
                    <QuizQuestionTypes
                        selectedTypes={quizQuestionTypes}
                        onToggleType={handleToggleQuestionType}
                    />
                </Animated.View>
                
                <MultilineInput
                    title="Notes for AI: (Optional)"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any additional context or instructions for the AI..."
                />
                
                <AuthenticationButton
                    title={loading ? "Creating..." : "Create!"}
                    onPress={handleCreate}
                    disabled={loading}
                />
            </ScrollView>
            <Modal
                visible={loading}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
            >
                <ProcessingLoader title="Creating..." message="Please don't close the app." />
            </Modal>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    mainContainer: {
        height: '100%',
        width: '100%',
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 70,
        marginBottom: 20,
    },
    titleText: {
        fontSize: 50,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        marginBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 30,
    },
    selectionContainer: {
        flexDirection: 'row',
        width: '100%',
        marginVertical: 10,
    },
    selectionGap: {
        width: 10,
    },
})
