# Testing the AI Pipeline

This test script processes PDF files from `app/test_examples/` through the entire AI pipeline and saves outputs for analysis.

## Setup

1. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

2. **Set environment variables:**
   
   You can either:
   
   **Option A:** Create a `.env` file in the `functions/` directory:
   ```bash
   cp .env.example .env
   # Then edit .env and fill in your values
   ```
   
   **Option B:** Export environment variables:
   ```bash
   export GCP_PROJECT_ID="ai-flashcard-app-bbe15"
   export GCP_PROCESSOR_ID="3b62aeb4bb65cf38"
   export GCP_LOCATION="us"
   export GEMINI_API_KEY="your-api-key-here"
   export GOOGLE_APPLICATION_CREDENTIALS="../config/ai-flashcard-app-bbe15-09b6cb11ebfb.json"
   ```
   
   **Option C:** Use dotenv (if you install it):
   ```bash
   npm install dotenv
   # Then create .env file and the script will load it
   ```

3. **Ensure test PDFs are in place:**
   - PDFs should be in `app/test_examples/` directory
   - The script will process all `.pdf` files it finds

## Running the Test

```bash
cd functions
npm run test
```

Or directly:
```bash
npx ts-node test-pipeline.ts
```

## What It Does

The test script:

1. **Reads all PDF files** from `app/test_examples/`
2. **Extracts text** using Google Cloud Document AI
3. **Checks for diagrams** (heuristic detection)
4. **Generates flashcards** using Gemini Pro (5 cards per PDF for testing)
5. **Transforms data** to Firestore format
6. **Saves outputs** to `functions/test-outputs/`:
   - `{filename}_extracted_text.json` - Raw extracted text
   - `{filename}_gemini_response.json` - Raw Gemini response
   - `{filename}_transformed_data.json` - Transformed Firestore data
   - `all_results_full_results.json` - Complete results from all files

## Analyzing Results

After running, check the `functions/test-outputs/` directory:

1. **Extracted Text**: Verify text extraction quality
2. **Gemini Response**: Check if JSON parsing works correctly
3. **Transformed Data**: Verify Firestore format is correct
4. **Console Output**: See real-time progress and any errors

## Common Issues

- **Missing API Keys**: Make sure `GEMINI_API_KEY` is set
- **Service Account**: Ensure the service account JSON file path is correct
- **Document AI**: Make sure Document AI processor is set up and accessible
- **PDF Format**: Some PDFs might not extract text well if they're image-based (scanned)

## Next Steps

After reviewing outputs:
1. Check if text extraction is accurate
2. Verify flashcard quality and relevance
3. Ensure JSON structure matches Firestore schema
4. Test with different PDF types (text-based vs scanned)
5. Adjust prompts if needed in `src/utils/promptBuilder.ts`

