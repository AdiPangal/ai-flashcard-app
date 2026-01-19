# Document AI Permission Setup

## Issue
The test script is getting a permission error:
```
Permission 'documentai.processors.processOnline' denied on resource
```

This means the service account needs permission to use Document AI.

## Solution

### Option 1: Grant Permission to Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin > IAM**
3. Find your service account: `firebase-adminsdk-fbsvc@ai-flashcard-app-bbe15.iam.gserviceaccount.com`
4. Click **Edit** (pencil icon)
5. Click **Add Another Role**
6. Add the role: **Document AI API User** (or `roles/documentai.apiUser`)
7. Save

Alternatively, you can grant the role via gcloud CLI:
```bash
gcloud projects add-iam-policy-binding ai-flashcard-app-bbe15 \
  --member="serviceAccount:firebase-adminsdk-fbsvc@ai-flashcard-app-bbe15.iam.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

### Option 2: Test Gemini Pipeline Only (Temporary)

If you want to test just the Gemini pipeline without Document AI:

```bash
export SKIP_DOCUMENT_AI=true
npm run test
```

This will use mock text and skip the Document AI extraction step, allowing you to test:
- Gemini Pro content generation
- JSON parsing
- Data transformation

## Verify Document AI is Enabled

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Enabled APIs**
3. Search for "Document AI API"
4. Make sure it's **enabled**

## Verify Processor Exists

1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Check that processor `3b62aeb4bb65cf38` exists in location `us`
3. Verify it's an OCR processor or General Document processor

