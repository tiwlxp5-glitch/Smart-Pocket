import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Temporary debug endpoint — test AI connectivity without auth
// REMOVE AFTER DEBUGGING
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const info: Record<string, any> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    api_key_present: !!apiKey,
    api_key_length: apiKey?.length ?? 0,
    api_key_prefix: apiKey ? apiKey.substring(0, 6) + '...' : 'MISSING',
  };

  if (!apiKey) {
    return Response.json({ status: 'ERROR', reason: 'NO_API_KEY', info });
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google('gemini-3.8-flash'),
      prompt: 'Reply with exactly: OK',
      maxOutputTokens: 10,
    });

    return Response.json({
      status: 'SUCCESS',
      ai_response: result.text,
      info,
    });
  } catch (error: any) {
    return Response.json({
      status: 'AI_ERROR',
      error_message: error.message,
      error_status_code: error.statusCode,
      error_cause: error.cause?.message,
      info,
    });
  }
}
