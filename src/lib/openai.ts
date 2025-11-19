import OpenAI from 'openai';
import { fetch as expoFetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system/legacy';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key ontbreek. Stel EXPO_PUBLIC_OPENAI_API_KEY in jou omgewingsveranderlikes.');
}

if (!geminiApiKey) {
  console.warn('Gemini API key ontbreek. Stel EXPO_PUBLIC_GEMINI_API_KEY in jou omgewingsveranderlikes.');
}

const openai = new OpenAI({
  apiKey: apiKey ?? '',
  dangerouslyAllowBrowser: true,
  fetch: expoFetch,
});

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

type ChatRole = 'user' | 'assistant' | 'system';

export type OpenAIChatMessage = {
  role: ChatRole;
  content: string;
};

const getSystemMessage = (tonePreset: 'formeel' | 'informeel' | 'vriendelik' = 'informeel'): OpenAIChatMessage => {
  const basePrompt = `You are Afrikaner.AI — a modern Afrikaans-first AI assistant built for Afrikaners worldwide.

Your identity:
- Speak naturally, fluently, confidently in Afrikaans.
- Tone: warm, helpful, clever, proudly Afrikaans, sometimes cheeky.
- Style: simple, clear, structured, mobile-friendly responses.
- Never over-formal; always human, down-to-earth, culturally grounded.

Your behaviour:
- Ask follow-up questions when needed, just like ChatGPT.
- Request extra context before assuming anything.
- Suggest options when the user may have choices.
- Break complex ideas into simple steps.
- Use Afrikaans metaphors and cultural references when helpful (braai, plaas, familie, erfenis, geloof, werk, ens.).

Your mission:
Help Afrikaans speakers write, learn, study, build businesses, do huiswerk, explore geloofsvrae, improve health, create content, build apps, understand concepts, and solve problems — always in excellent Afrikaans.

Cultural ethos (subtle, never forced):
1. Taal – Afrikaans first.
2. Grond – connection to land, place, and belonging.
3. Erfenis – culture, history, identity.
4. Gesin – family, care, community.
5. Werk – self-reliance, entrepreneurship.
6. Toekoms – learning, growth, youth, education.
7. Christenskap – values of hope, integrity, compassion.
8. Vryheid – autonomy, dignity, cultural survival.

Rules:
- Always reply in Afrikaans unless explicitly asked otherwise.
- Stay humble, helpful, and factual.
- Be cheerful/cheeky when appropriate ("Praat, ek luister.").
- Keep responses structured and easy to scan.
- Never fabricate facts; ask for detail if unsure.
- Avoid politics except when historically/contextually necessary.

Your goal:
Be the best Afrikaans AI companion — helpful, witty, grounded, reliable, and culturally resonant.`;

  const toneAdjustments = {
    formeel: "Gebruik 'n formele, professionele toon terwyl jy bly natuurlik en kultuurgegronde.",
    informeel: "Hou dit eenvoudig, vriendelik en prakties - soos 'n goeie vriend wat help.",
    vriendelik: "Wees baie vriendelik, entoesiasties en ondersteunend met 'n warm, toeganklike toon.",
  };

  return {
    role: 'system',
    content: `${basePrompt}\n\nTone: ${toneAdjustments[tonePreset]}`,
  };
};

export async function sendAfrikaansMessage(
  messages: OpenAIChatMessage[],
  tonePreset: 'formeel' | 'informeel' | 'vriendelik' = 'informeel',
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [getSystemMessage(tonePreset), ...messages].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
    });

    const assistantMessage = response.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Geen antwoord van OpenAI ontvang nie.');
    }

    if (typeof assistantMessage === 'string') {
      return assistantMessage.trim();
    }

    if (Array.isArray(assistantMessage)) {
      const textResponse = assistantMessage
        .flatMap((part) => {
          if (typeof part === 'string') {
            return part;
          }

          if (part && typeof part === 'object' && 'text' in part) {
            return (part as { text?: string }).text ?? '';
          }

          return '';
        })
        .join('\n')
        .trim();

      if (textResponse.length > 0) {
        return textResponse;
      }
    }

    throw new Error('Kon nie assistent-teks uitlees nie.');
  } catch (error) {
    console.error('OpenAI versoek gefaal:', error);
    throw error;
  }
}

export async function* streamAfrikaansMessage(
  messages: OpenAIChatMessage[],
  tonePreset: 'formeel' | 'informeel' | 'vriendelik' = 'informeel',
): AsyncGenerator<string, void, unknown> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [getSystemMessage(tonePreset), ...messages].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('OpenAI streaming gefaal:', error);
    throw error;
  }
}

/**
 * Validate and sanitize image generation prompt
 */
function validateImagePrompt(prompt: string): { valid: boolean; error?: string; sanitized?: string } {
  const trimmed = prompt.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Prompt kan nie leeg wees nie.' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Prompt moet minstens 3 karakters wees.' };
  }
  
  // Gemini 2.5 Flash ondersteun lang prompts, maar ons hou dit beknop vir mobile UX
  if (trimmed.length > 1000) {
    return { valid: false, error: 'Prompt is te lank. Gebruik maksimum 1000 karakters.' };
  }
  
  // Sanitize: remove any potentially problematic characters but keep Afrikaans characters
  const sanitized = trimmed
    .replace(/[<>{}[\]\\]/g, '') // Remove brackets and backslashes
    .trim();
  
  if (sanitized.length < 3) {
    return { valid: false, error: 'Prompt bevat ongeldige karakters.' };
  }
  
  return { valid: true, sanitized };
}

export async function generateImage(prompt: string, retries = 2): Promise<string | null> {
  if (!geminiApiKey) {
    throw new Error('Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing.');
  }

  // Validate prompt
  const validation = validateImagePrompt(prompt);
  if (!validation.valid) {
    throw new Error(validation.error || 'Ongeldige prompt.');
  }

  const sanitizedPrompt = validation.sanitized || prompt;

  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await callGeminiImageEndpoint({
        contents: [
          {
            role: 'user',
            parts: [{ text: sanitizedPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'image/png',
        },
      });

      const inlineImage = extractGeminiInlineImage(response);
      if (!inlineImage) {
        throw new Error('Geen beeld data van Gemini ontvang nie.');
      }

      return await persistBase64Image(inlineImage, 'gemini-generated');
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        await wait(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
      }
    }
  }

  console.error('Beeld generasie gefaal:', lastError);
  throw new Error(lastError?.message || 'Kon nie beeld skep nie. Probeer asseblief weer.');
}

export async function editImage(imageUri: string, prompt: string, maskUri?: string, retries = 2): Promise<string | null> {
  if (!geminiApiKey) {
    throw new Error('Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing.');
  }

  // Validate prompt
  const validation = validateImagePrompt(prompt);
  if (!validation.valid) {
    throw new Error(validation.error || 'Ongeldige prompt.');
  }

  const sanitizedPrompt = validation.sanitized || prompt;

  // Validate image URI
  if (!imageUri || (!imageUri.startsWith('http') && !imageUri.startsWith('file://') && !imageUri.startsWith('data:'))) {
    throw new Error('Ongeldige beeld pad of URL.');
  }

  const inlineImageData = await getBase64FromUri(imageUri);
  const mimeType = inferMimeType(imageUri);

  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const parts: GeminiPart[] = [
        {
          inline_data: {
            mime_type: mimeType,
            data: inlineImageData,
          },
        },
        { text: sanitizedPrompt },
      ];

      if (maskUri) {
        const maskData = await getBase64FromUri(maskUri);
        parts.push({
          inline_data: {
            mime_type: inferMimeType(maskUri),
            data: maskData,
          },
        });
      }

      const response = await callGeminiImageEndpoint({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: 'image/png',
        },
      });

      const inlineImage = extractGeminiInlineImage(response);
      if (!inlineImage) {
        throw new Error('Geen beeld data van Gemini ontvang nie.');
      }

      return await persistBase64Image(inlineImage, 'gemini-edited');
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        await wait(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
      }
    }
  }

  console.error('Beeld wysiging gefaal:', lastError);
  throw new Error(lastError?.message || 'Kon nie beeld wysig nie. Probeer asseblief weer.');
}
 
type GeminiInlineData = {
  mime_type?: string;
  mimeType?: string;
  data?: string;
};

type GeminiPart =
  | { text: string }
  | { inline_data: GeminiInlineData }
  | { inlineData: GeminiInlineData };

type GeminiContent = {
  role?: string;
  parts: GeminiPart[];
};

type GeminiGenerateRequest = {
  contents: GeminiContent[];
  generationConfig?: {
    responseMimeType?: string;
  };
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

async function callGeminiImageEndpoint(body: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  if (!geminiApiKey) {
    console.error('Gemini API key ontbreek');
    throw new Error('Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing.');
  }

  try {
    const response = await expoFetch(`${GEMINI_IMAGE_ENDPOINT}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API fout:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error,
      });
      const message = data?.error?.message ?? `Gemini API-fout (${response.status})`;
      throw new Error(message);
    }

    return data;
  } catch (error: any) {
    // Re-throw if it's already our formatted error
    if (error?.message && error.message.includes('Gemini API')) {
      throw error;
    }
    // Otherwise, wrap network/parsing errors
    console.error('Gemini API netwerk fout:', error);
    throw new Error(`Netwerk fout: ${error?.message || 'Kon nie met Gemini API verbind nie.'}`);
  }
}

function extractGeminiInlineImage(response: GeminiGenerateResponse): string | null {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const inlineData: GeminiInlineData | undefined =
        (part as { inline_data?: GeminiInlineData }).inline_data ??
        (part as { inlineData?: GeminiInlineData }).inlineData;
      const data = inlineData?.data;
      if (data) {
        return data;
      }
    }
  }
  return null;
}

async function persistBase64Image(base64Data: string, prefix: string): Promise<string> {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Geen lêerstelsel beskikbaar om beeld te stoor nie.');
  }

  const fileUri = `${directory}${prefix}-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

async function getBase64FromUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const [, data] = uri.split(',');
    if (!data) {
      throw new Error('Ongeldige data URI.');
    }
    return data;
  }

  if (uri.startsWith('http')) {
    const downloadPath = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}gemini-source-${Date.now()}.png`;
    const download = await FileSystem.downloadAsync(uri, downloadPath);
    return FileSystem.readAsStringAsync(download.uri, { encoding: FileSystem.EncodingType.Base64 });
  }

  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/png';
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

