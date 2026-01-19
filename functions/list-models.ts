/**
 * Helper script to list available Gemini models
 */

import {GoogleGenerativeAI} from '@google/generative-ai';

// Try to load .env file if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  // Try common model names directly
  console.log('Testing common model names...\n');
  const commonModels = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro-latest',
    'gemini-1.0-pro'
  ];
  
  for (const modelName of commonModels) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({model: modelName});
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ ${modelName} WORKS! Response: ${text.substring(0, 50)}...\n`);
      break;
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        console.log(`❌ ${modelName} - not found\n`);
      } else if (errorMsg.includes('429')) {
        console.log(`⚠️  ${modelName} - rate limit\n`);
      } else {
        console.log(`⚠️  ${modelName} - ${errorMsg.substring(0, 150)}\n`);
      }
    }
  }
}

listModels();

