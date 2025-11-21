import OpenAI from 'openai';
import { fetch as expoFetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system/legacy';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

const runtimeFetch: typeof fetch =
  typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : (expoFetch as typeof fetch);

if (!apiKey) {
  console.warn('OpenAI API key ontbreek. Stel EXPO_PUBLIC_OPENAI_API_KEY in jou omgewingsveranderlikes.');
}

if (!geminiApiKey) {
  console.warn('Gemini API key ontbreek. Stel EXPO_PUBLIC_GEMINI_API_KEY in jou omgewingsveranderlikes.');
}

// Use expo/fetch directly for OpenAI to support streaming
const openai = new OpenAI({
  apiKey: apiKey ?? '',
  dangerouslyAllowBrowser: true,
  fetch: expoFetch,
});

function extractResponseText(response: any): string | null {
  const segments: string[] = [];

  const addSegment = (value?: string | null) => {
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }
  };

  if (Array.isArray(response?.output)) {
    response.output.forEach((item: any) => {
      if (!item || !Array.isArray(item.content)) {
        return;
      }

      item.content.forEach((part: any) => {
        if (typeof part === 'string') {
          addSegment(part);
          return;
        }

        if (Array.isArray(part?.text)) {
          addSegment(part.text.join('\n'));
          return;
        }

        if (typeof part?.text === 'string') {
          addSegment(part.text);
          return;
        }

        if (Array.isArray(part?.output_text)) {
          addSegment(part.output_text.join('\n'));
          return;
        }

        if (typeof part?.content === 'string') {
          addSegment(part.content);
        }
      });
    });
  }

  if (Array.isArray(response?.output_text)) {
    addSegment(response.output_text.join('\n'));
  } else if (typeof response?.output_text === 'string') {
    addSegment(response.output_text);
  }

  if (typeof response?.content === 'string') {
    addSegment(response.content);
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join('\n').trim();
}

// Using gemini-3-pro-preview for image generation and editing
// Using v1alpha API for media_resolution support
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-preview';
const GEMINI_IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1alpha/models/${GEMINI_IMAGE_MODEL}:generateContent`;
const GEMINI_VISION_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`;

type ChatRole = 'user' | 'assistant' | 'system';

export type OpenAIChatMessage = {
  role: ChatRole;
  content: string;
};

const getSystemMessage = (tonePreset: 'formeel' | 'informeel' | 'vriendelik' = 'informeel'): OpenAIChatMessage => {
  const basePrompt = `You are Koedoe — a modern Afrikaans-first AI assistant built for Afrikaners worldwide.

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

export type ImageGenerationOptions = {
  thinkingLevel?: 'low' | 'high';
  mediaResolution?: 'media_resolution_low' | 'media_resolution_high';
  retries?: number;
};

export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string | null> {
  if (!geminiApiKey) {
    throw new Error('Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing.');
  }

  // Validate prompt
  const validation = validateImagePrompt(prompt);
  if (!validation.valid) {
    throw new Error(validation.error || 'Ongeldige prompt.');
  }

  const sanitizedPrompt = validation.sanitized || prompt;
  const {
    thinkingLevel = 'low', // Default to low for faster generation
    mediaResolution = 'media_resolution_high', // Default to high for quality
    retries = 2,
  } = options;

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
          thinkingLevel,
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

export type ImageEditOptions = {
  thinkingLevel?: 'low' | 'high';
  mediaResolution?: 'media_resolution_low' | 'media_resolution_high';
  retries?: number;
};

export async function editImage(
  imageUri: string,
  prompt: string,
  maskUri?: string,
  options: ImageEditOptions = {}
): Promise<string | null> {
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

  const {
    thinkingLevel = 'low', // Default to low for faster editing
    mediaResolution = 'media_resolution_high', // Default to high for quality
    retries = 2,
  } = options;

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
          media_resolution: { level: mediaResolution },
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
          media_resolution: { level: mediaResolution },
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
          thinkingLevel,
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

type IdentifyImageOptions = {
  scenario?: 'plant' | 'object' | 'general';
  extraInstructions?: string;
};

export async function identifyImageSubject(imageUri: string, options: IdentifyImageOptions = {}): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  const base64Image = await getBase64FromUri(imageUri);
  const mimeType = inferMimeType(imageUri);
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  const prompts = {
    plant:
      "Jy is 'n Afrikaans-sprekende veldgids en plantkundige. Identifiseer die plantspesie of jou beste raaiskoot, beskryf opvallende kenmerke, gee versorgingswenke en noem moontlike gebruike of giftigheid. As dit nie 'n plant is nie, verduidelik kortliks wat wel sigbaar is.",
    object:
      "Jy is 'n Afrikaanse produkkenner. Beskryf wat jy sien, identifiseer die item indien moontlik en verduidelik relevante inligting of gebruike.",
    general:
      "Jy is 'n oplettende Afrikaanse assistent. Beskryf wat jy in die foto sien - identifiseer voorwerpe, mense, plekke, of enigiets anders wat sigbaar is. Gee nuttige inligting oor wat jy waarneem. Aan die einde van jou antwoord, vra vriendelik: 'Het jy enige verdere vrae oor hierdie foto?'",
  };

  const scenarioPrompt = prompts[options.scenario ?? 'general'];
  const instructions = `${scenarioPrompt}\n\nAntwoord in Afrikaans met duidelike opskrifte en stappe. ${
    options.extraInstructions ?? ''
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
      {
        role: 'user',
          content: [
          {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
            },
          },
            {
              type: 'text',
              text: instructions,
            },
        ],
      },
    ],
      temperature: 0.7,
      max_tokens: 1000,
  });

    const description = response.choices[0]?.message?.content;
  if (!description) {
      throw new Error('Geen beskrywing van OpenAI ontvang nie.');
  }

  return description.trim();
  } catch (error: any) {
    console.error('OpenAI Vision API gefaal:', error);
    throw new Error(error?.message || 'Kon nie beeld analiseer nie. Probeer asseblief weer.');
  }
}

async function uploadFileToOpenAI(documentUri: string, documentName: string, mimeType?: string): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  let localUri = documentUri;
  let tempDownload: string | null = null;

  if (documentUri.startsWith('http://') || documentUri.startsWith('https://')) {
    const targetDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!targetDirectory) {
      throw new Error('Geen tydelike vouer beskikbaar vir dokument aflaai nie.');
    }
    const downloadPath = `${targetDirectory}openai-doc-${Date.now()}`;
    const downloadResult = await FileSystem.downloadAsync(documentUri, downloadPath);
    localUri = downloadResult.uri;
    tempDownload = downloadResult.uri;
  }

  const formData = new FormData();
  formData.append('purpose', 'assistants');
  formData.append(
    'file',
    {
      uri: localUri,
      name: documentName || `document-${Date.now()}.txt`,
      type: mimeType || 'application/octet-stream',
    } as any,
  );

  try {
    const response = await runtimeFetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI] File upload failed:', errorText);
      throw new Error('Kon nie dokument na OpenAI oplaai nie. Probeer asseblief weer.');
    }

    const data = await response.json();
    if (!data?.id) {
      throw new Error('OpenAI het geen lêer ID teruggestuur nie.');
    }

    return data.id as string;
  } finally {
    if (tempDownload) {
      FileSystem.deleteAsync(tempDownload, { idempotent: true }).catch(() => {});
    }
  }
}

async function deleteFileFromOpenAI(fileId: string): Promise<void> {
  if (!apiKey || !fileId) {
    return;
  }

  const response = await runtimeFetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('[OpenAI] Kon nie tydelike dokument skrap nie:', errorText);
  }
}

export async function answerQuestionAboutDocument(
  documentUri: string,
  documentName: string,
  mimeType: string | undefined,
  userQuestion: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  try {
    const question = userQuestion.trim() || 'Gee my \'n opsomming van hierdie dokument.';
    const fileId = await uploadFileToOpenAI(documentUri, documentName, mimeType);

    try {
      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  "Jy is Koedoe, 'n Afrikaans-sprekende assistent. Beantwoord slegs die gebruiker se vraag oor die aangehegte dokument met duidelike, praktiese inligting sonder ekstra toeligtings of Bybelse toepassings tensy dit eksplisiet gevra word.",
              },
              {
                type: 'input_text',
                text:
                  "Struktuur jou antwoord soos volg:\n1. Jou hoofantwoord op die vraag, net gebaseer op die dokument.\n2. 'n Kort vervolgvraag wat begin met \"Kan ek verder help deur...\"",
              },
              { type: 'input_text', text: question },
              { type: 'input_file', file_id: fileId },
            ],
          },
        ],
      });

      const answer = extractResponseText(response);

      if (!answer) {
        throw new Error('Geen antwoord van OpenAI ontvang nie.');
      }

      return answer;
    } finally {
      if (fileId) {
        deleteFileFromOpenAI(fileId).catch((cleanupError) => {
          console.warn('[OpenAI] Kon nie tydelike dokument skrap nie:', cleanupError);
        });
      }
    }
  } catch (error: any) {
    console.error('OpenAI dokument analise gefaal:', error);
    throw new Error(error?.message || 'Kon nie dokument analiseer nie. Probeer asseblief weer.');
  }
}
 
type GeminiInlineData = {
  mime_type?: string;
  mimeType?: string;
  data?: string;
};

type GeminiPart =
  | { text: string }
  | { inline_data: GeminiInlineData; media_resolution?: { level: string } }
  | { inlineData: GeminiInlineData; mediaResolution?: { level: string } };

type GeminiContent = {
  role?: string;
  parts: GeminiPart[];
};

type GeminiGenerateRequest = {
  contents: GeminiContent[];
  generationConfig?: {
    responseMimeType?: string;
    thinkingLevel?: 'low' | 'high';
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

async function callGeminiEndpoint(
  endpoint: string,
  body: GeminiGenerateRequest,
  retries = 2,
): Promise<GeminiGenerateResponse> {
  if (!geminiApiKey) {
    console.error('Gemini API key ontbreek');
    throw new Error('Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing.');
  }

  // Debug: Log API key presence (first 10 chars only for security)
  const apiKeyPreview = geminiApiKey.substring(0, 10) + '...';
  console.log(`[Gemini Debug] API key aanwesig: ${apiKeyPreview}`);
  console.log(`[Gemini Debug] Endpoint: ${endpoint}`);

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`[Gemini Debug] Retry poging ${attempt}/${retries} na ${delay}ms...`);
        await wait(delay);
      }

      const url = `${endpoint}?key=${geminiApiKey}`;
      const response = await runtimeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || '';
      console.log(`[Gemini Debug] Response status: ${response.status}, Content-Type: ${contentType}`);

      // Read response body once (can only be read once)
      const responseText = await response.text();
      console.log(`[Gemini Debug] Response length: ${responseText.length} chars`);

    if (!response.ok) {
        // Try to parse error response
        let errorData: any;
        try {
          errorData = JSON.parse(responseText);
          console.error(`[Gemini Debug] Error response body: ${responseText.substring(0, 500)}`);
        } catch (parseError) {
          console.error(`[Gemini Debug] Error response (not JSON): ${responseText.substring(0, 500)}`);
          throw new Error(`Gemini API fout (${response.status}): ${responseText.substring(0, 200)}`);
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
      console.error('Gemini API fout:', {
        status: response.status,
        statusText: response.statusText,
            error: errorData?.error,
      });
          const message = errorData?.error?.message ?? `Gemini API-fout (${response.status})`;
      throw new Error(message);
    }

        // Retry on server errors (5xx)
        throw new Error(`Gemini API server fout (${response.status})`);
      }

      // Parse JSON response
      let data: GeminiGenerateResponse;
      try {
        data = JSON.parse(responseText);
        console.log(`[Gemini Debug] Successfully parsed response`);
    return data;
      } catch (parseError: any) {
        console.error(`[Gemini Debug] Failed to parse JSON response: ${responseText.substring(0, 500)}`);
        throw new Error(`Kon nie Gemini antwoord parse nie: ${parseError?.message || parseError}`);
      }
  } catch (error: any) {
      lastError = error;

      // Check if it's a network error that we should retry
      const isNetworkError =
        error?.message?.includes('network') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('fetch failed') ||
        error?.message?.includes('timeout');

      // Don't retry on client errors or if we've exhausted retries
      if (!isNetworkError || attempt >= retries) {
    // Re-throw if it's already our formatted error
    if (error?.message && error.message.includes('Gemini API')) {
      throw error;
    }
    // Otherwise, wrap network/parsing errors
    console.error('Gemini API netwerk fout:', error);
    throw new Error(`Netwerk fout: ${error?.message || 'Kon nie met Gemini API verbind nie.'}`);
  }

      // Continue to retry for network errors
      console.warn(`[Gemini Debug] Netwerk fout, sal weer probeer... (${attempt + 1}/${retries + 1})`);
    }
  }

  // If we get here, all retries failed
  console.error('Gemini API gefaal na alle pogings:', lastError);
  throw new Error(`Netwerk fout: ${lastError?.message || 'Kon nie met Gemini API verbind nie na verskeie pogings.'}`);
}

async function callGeminiImageEndpoint(body: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  return callGeminiEndpoint(GEMINI_IMAGE_ENDPOINT, body);
}

async function callGeminiVisionEndpoint(body: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  return callGeminiEndpoint(GEMINI_VISION_ENDPOINT, body);
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

function extractGeminiText(response: GeminiGenerateResponse): string | null {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const textValue = (part as { text?: string }).text;
      if (textValue) {
        return textValue;
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

