/**
 * Quick script to verify Gemini API key is working
 * Run: node scripts/check-gemini-key.js
 */

require('dotenv').config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const TEST_MODEL = 'gemini-2.0-flash-exp'; // Using 2.0 experimental as 2.5 might not exist
const TEST_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL}:generateContent`;

async function testGeminiKey() {
  if (!GEMINI_API_KEY) {
    console.error('❌ EXPO_PUBLIC_GEMINI_API_KEY nie gevind nie in .env.local');
    console.log('\nMaak seker jou .env.local bevat:');
    console.log('EXPO_PUBLIC_GEMINI_API_KEY=jou_api_key_hier');
    return;
  }

  console.log('✅ API Key gevind:', GEMINI_API_KEY.substring(0, 15) + '...');
  console.log('🧪 Toets verbinding met Gemini API...\n');

  try {
    const response = await fetch(`${TEST_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Say "Hello" in Afrikaans' }],
          },
        ],
      }),
    });

    const text = await response.text();
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ API Fout:');
      try {
        const errorData = JSON.parse(text);
        console.error(JSON.stringify(errorData, null, 2));
      } catch {
        console.error('Response (nie JSON nie):', text.substring(0, 500));
      }
      return;
    }

    const data = JSON.parse(text);
    console.log('✅ Suksesvol! Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Netwerk fout:', error.message);
  }
}

testGeminiKey();

