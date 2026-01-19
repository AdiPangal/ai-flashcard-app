/**
 * Build prompt for diagram understanding
 */
export function buildDiagramPrompt(): string {
  return `Describe this diagram in detail, including all concepts, labels, relationships, and any text visible. 
Focus on information that would be useful for creating educational flashcards. 
Output as a clear, comprehensive plain text description.`;
}

/**
 * Build prompt for flashcard generation
 */
export function buildFlashcardPrompt(
  text: string,
  numCards: number,
  notes?: string
): string {
  return `Generate exactly ${numCards} flashcards from the following content. 
Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "title": "string",
  "tags": ["string"],
  "cards": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}

Content: ${text}
${notes ? `User notes: ${notes}` : ''}

Make sure the questions are clear and the answers are comprehensive. Ensure the JSON is valid and parseable.`;
}

/**
 * Build prompt for quiz generation
 */
export function buildQuizPrompt(
  text: string,
  numQuestions: number,
  questionTypes: string[],
  notes?: string
): string {
  const typesList = questionTypes.join(', ');
  
  return `Generate exactly ${numQuestions} quiz questions from the following content.
Use these question types: ${typesList}.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "title": "string",
  "tags": ["string"],
  "questionsList": [
    {
      "type": "multiple-choice" | "multiple-selection" | "fill-in-the-blank",
      "question": "string",
      "answer": "string" or ["string"] for multiple-selection,
      "options": ["string"] for multiple-choice/multiple-selection
    }
  ]
}

Content: ${text}
${notes ? `User notes: ${notes}` : ''}

Make sure:
- For multiple-choice and multiple-selection: provide 4-5 options
- For fill-in-the-blank: answer should be the correct fill-in
- For multiple-selection: answer should be an array of correct options
- Questions should test understanding of the content
- Ensure the JSON is valid and parseable.`;
}

