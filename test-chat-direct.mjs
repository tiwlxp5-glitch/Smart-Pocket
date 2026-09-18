// Direct test — reads .env.local manually and passes key directly
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, toUIMessageStream, convertToModelMessages } from 'ai';
import { readFileSync } from 'fs';

// Load env manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const apiKey = envVars['GEMINI_API_KEY'] || envVars['GOOGLE_GENERATIVE_AI_API_KEY'];
console.log('API Key found:', apiKey ? `YES (${apiKey.length} chars, starts: ${apiKey.substring(0, 8)}...)` : 'MISSING');

if (!apiKey) {
  console.error('No API key found in .env.local!');
  process.exit(1);
}

const google = createGoogleGenerativeAI({ apiKey });

async function testChat() {
  console.log('\n=== Testing streamText + toUIMessageStream ===');
  
  const messages = [
    { id: '1', role: 'user', parts: [{ type: 'text', text: 'สวัสดีครับ' }] }
  ];

  try {
    const modelMessages = await convertToModelMessages(messages);
    console.log('✓ convertToModelMessages OK');

    const result = await streamText({
      model: google('gemini-3.8-flash'),
      system: 'คุณคือ Smart Pocket Advisor ตอบเป็นภาษาไทย สั้นๆ 1-2 ประโยค',
      messages: modelMessages,
    });
    console.log('✓ streamText returned');

    const uiStream = toUIMessageStream({ stream: result.stream });
    console.log('✓ toUIMessageStream returned');

    const reader = uiStream.getReader();
    let chunks = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks++;
      const str = JSON.stringify(value);
      
      if (value.type === 'error') {
        console.error(`\n❌ ERROR CHUNK: ${str}`);
      } else if (chunks <= 10) {
        console.log(`  Chunk ${chunks}: ${str.substring(0, 150)}`);
      }
    }
    
    console.log(`\n${chunks > 2 ? '✅' : '❌'} Total chunks: ${chunks}`);
    
  } catch (error) {
    console.error('\n❌ EXCEPTION:', error.message);
    if (error.cause) console.error('Cause:', error.cause);
  }
}

testChat();
