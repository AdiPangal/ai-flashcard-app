import { FileItem } from '@/components/buttons/fileUploadButton';

export type SubmissionData = {
    selectionType: "flashcard" | "quiz";
    files: FileItem[];
    numberOfItems: number;
    quizQuestionTypes?: string[];
    notes?: string;
    timestamp: Date;
}

export type ValidationError = {
    field: string;
    message: string;
}

export function prepareSubmissionData(
    selectionType: "flashcard" | "quiz",
    files: FileItem[],
    numberOfItems: number,
    quizQuestionTypes?: string[],
    notes?: string
): { data: SubmissionData | null; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    
    // Validate files
    if (files.length === 0) {
        errors.push({
            field: 'files',
            message: 'At least one file must be selected'
        });
    }
    
    // Validate number of items
    if (numberOfItems <= 0) {
        errors.push({
            field: 'numberOfItems',
            message: 'Number of items must be greater than 0'
        });
    }
    
    // Validate quiz question types if in quiz mode
    if (selectionType === 'quiz') {
        if (!quizQuestionTypes || quizQuestionTypes.length === 0) {
            errors.push({
                field: 'quizQuestionTypes',
                message: 'At least one question type must be selected'
            });
        }
    }
    
    // If there are errors, return null data
    if (errors.length > 0) {
        return { data: null, errors };
    }
    
    // Prepare submission data
    const data: SubmissionData = {
        selectionType,
        files,
        numberOfItems,
        notes: notes?.trim() || undefined,
        timestamp: new Date(),
    };
    
    if (selectionType === 'quiz' && quizQuestionTypes) {
        data.quizQuestionTypes = quizQuestionTypes;
    }
    
    return { data, errors: [] };
}

