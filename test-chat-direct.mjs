// Test the new route logic directly (without Next.js)
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, toUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from 'ai';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const apiKey = envVars['GEMINI_API_KEY'];
console.log('API Key:', apiKey ? `YES (${apiKey.length} chars)` : 'MISSING');

const google = createGoogleGenerativeAI({ apiKey });

async function testNewRoute() {
  console.log('\n=== Testing result.toUIMessageStreamResponse() approach ===');

  const messages = [
    { id: '1', role: 'user', parts: [{ type: 'text', text: 'ตอนนี้การเงินผมเป็นยังไงบ้าง' }] }
  ];
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google('gemini-3.8-flash'),
    system: 'ตอบสั้นๆ 1 ประโยคเท่านั้น',
    messages: modelMessages,
    onError: (event) => {
      console.error('onError callback:', event.error);
    },
  });

  console.log('streamText called (non-await)');
  console.log('result type:', typeof result);
  console.log('result.stream type:', typeof result.stream);

  // Test the toUIMessageStreamResponse method
  const response = result.toUIMessageStreamResponse();
  console.log('response type:', typeof response);
  console.log('response status:', response.status);
  console.log('response headers:', Object.fromEntries(response.headers.entries()));

  // Read the response body
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunks = 0;
  let hasError = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    chunks++;
    if (text.includes('"error"') || text.includes('"type":"error"')) {
      console.error(`❌ Error chunk ${chunks}:`, text.substring(0, 300));
      hasError = true;
    } else if (chunks <= 5) {
      console.log(`  Chunk ${chunks}: ${text.substring(0, 200)}`);
    }
  }

  console.log(`\n${hasError ? '❌' : '✅'} Done: ${chunks} chunks, error=${hasError}`);
}

testNewRoute().catch(console.error);
