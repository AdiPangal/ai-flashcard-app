# Environment Variables Setup

This project uses environment variables to store sensitive configuration like API keys and Firebase credentials.

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your actual values:**
   - Get Firebase config from: Firebase Console > Project Settings > General > Your apps
   - Get Google Web Client ID from: Firebase Console > Authentication > Sign-in method > Google

3. **Restart your Expo development server** after making changes to `.env`

## Environment Variables

### Client-Side Variables (EXPO_PUBLIC_*)

These variables are exposed to the client-side code and should be prefixed with `EXPO_PUBLIC_`:

- `EXPO_PUBLIC_FIREBASE_API_KEY` - Firebase API Key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase Project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase App ID
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` - Firebase Measurement ID (for Analytics)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Google Sign-In Web Client ID

### Server-Side Variables (Firebase Functions)

These are used in the `functions/` directory:

- `GEMINI_API_KEY` - Google Gemini API key for AI features
- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_PROCESSOR_ID` - Document AI Processor ID
- `GCP_LOCATION` - GCP Region (default: "us")
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file

## Security Notes

⚠️ **Important:**
- Never commit `.env` files to version control
- The `.env` file is already in `.gitignore`
- Service account JSON files in `config/` are also ignored
- Use `.env.example` as a template (without real values) for documentation

## How It Works

1. **Client-side (React Native app):**
   - Variables with `EXPO_PUBLIC_` prefix are automatically available via `process.env`
   - The app reads these directly from `process.env` in `contexts/AuthContext.tsx`
   - No additional configuration needed - Expo handles this automatically

2. **Server-side (Firebase Functions):**
   - Use `process.env.VARIABLE_NAME` directly
   - Set these in Firebase Console > Functions > Configuration
   - Or use `firebase functions:config:set` command

## Getting Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ > Project Settings
4. Scroll down to "Your apps" section
5. Click on your web app (or create one)
6. Copy the configuration values

## Getting Google Web Client ID

1. Go to Firebase Console > Authentication > Sign-in method
2. Click on "Google" provider
3. Under "Web SDK configuration", copy the "Web client ID"
4. It should look like: `123456789-xxxxx.apps.googleusercontent.com`

## Troubleshooting

- **Variables not updating?** Restart your Expo dev server
- **Build errors?** Make sure all required variables are set
- **Functions not working?** Check Firebase Functions logs and ensure server-side env vars are set
