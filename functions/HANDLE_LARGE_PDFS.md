# Handling Large PDFs (Over 30 Pages)

## Current Issue
Document AI has page limits:
- **Regular mode**: 15 pages maximum
- **Imageless mode** (if enabled): 30 pages maximum

Your test PDFs exceed these limits:
- Chapter6_complete.pdf: 38 pages ❌
- Cloud 101 for 181 v3.pdf: 26 pages (exceeds 15, needs imageless mode)
- Topic 6.pdf: 30 pages (exceeds 15, needs imageless mode)
- Trees-1-A.pdf: 42 pages ❌

## Solutions

### Option 1: Enable Imageless Mode on Processor (Recommended for 26-30 page PDFs)
1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai/processors)
2. Select your processor: `3b62aeb4bb65cf38`
3. Check processor configuration for imageless mode option
4. Enable imageless mode if available
5. This increases limit from 15 to 30 pages

### Option 2: Split Large PDFs (For PDFs > 30 pages)
For PDFs exceeding 30 pages, split them into chunks:
- Use PDF splitting libraries (pdf-lib, pdf2pic, etc.)
- Process each chunk separately
- Combine extracted text before sending to Gemini

### Option 3: Use Batch Processing API
- Document AI supports batch processing for large documents
- More complex setup but handles very large PDFs
- Better for production scale

### Option 4: User Guidance (Quick Fix)
- Add validation in UI to limit PDF uploads to 30 pages
- Show helpful error message if exceeded
- Suggest users split PDFs before uploading

## For Testing
To test the pipeline with your PDFs:
1. Split large PDFs into smaller chunks (≤30 pages each)
2. Or create test PDFs that are within limits
3. Process each chunk and combine results

## Implementation Notes
The current code handles page limit errors gracefully and provides helpful error messages. For production, consider implementing:
- PDF splitting functionality
- Batch processing for large files
- User-facing warnings about file size limits


