import OpenAI from "openai";
import { fetch as expoFetch } from "expo/fetch";
import * as FileSystem from "expo-file-system/legacy";
import type { MemoryType } from "@/lib/memories";

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const geminiApiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

const runtimeFetch: typeof fetch =
  typeof globalThis !== "undefined" && typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : (expoFetch as typeof fetch);

if (!apiKey) {
  console.warn(
    "OpenAI API key ontbreek. Stel EXPO_PUBLIC_OPENAI_API_KEY in jou omgewingsveranderlikes."
  );
}

if (!geminiApiKey) {
  console.warn(
    "Gemini API key ontbreek. Stel EXPO_PUBLIC_GEMINI_API_KEY in jou omgewingsveranderlikes."
  );
}

// Use expo/fetch directly for OpenAI to support streaming
const openai = new OpenAI({
  apiKey: apiKey ?? "",
  dangerouslyAllowBrowser: true,
  fetch: expoFetch,
});

function extractResponseText(response: any): string | null {
  const segments: string[] = [];

  const addSegment = (value?: string | null) => {
    if (value && typeof value === "string") {
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
        if (typeof part === "string") {
          addSegment(part);
          return;
        }

        if (Array.isArray(part?.text)) {
          addSegment(part.text.join("\n"));
          return;
        }

        if (typeof part?.text === "string") {
          addSegment(part.text);
          return;
        }

        if (Array.isArray(part?.output_text)) {
          addSegment(part.output_text.join("\n"));
          return;
        }

        if (typeof part?.content === "string") {
          addSegment(part.content);
        }
      });
    });
  }

  if (Array.isArray(response?.output_text)) {
    addSegment(response.output_text.join("\n"));
  } else if (typeof response?.output_text === "string") {
    addSegment(response.output_text);
  }

  if (typeof response?.content === "string") {
    addSegment(response.content);
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join("\n").trim();
}

// Using gemini-3-pro-image-preview for image generation and editing
// Using v1beta API as per Nano Banana docs
const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";
const GEMINI_IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;
const GEMINI_VISION_MODEL = "gemini-2.0-flash-exp";
const GEMINI_VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`;

type ChatRole = "user" | "assistant" | "system";

export type OpenAIChatMessage = {
  role: ChatRole;
  content: string;
};

export type ExtractedMemory = {
  type: MemoryType;
  title: string;
  content: string;
};

const KOEDOE_SYSTEM_PROMPT = `Jy is Koedoe, 'n Afrikaans-eerste KI-assistent wat natuurlike, moderne, korrekte Afrikaans gebruik. Volg hierdie reëls:

Taal:
- Antwoord altyd in natuurlike Afrikaans, tensy die gebruiker anders vra.
- Geen anglisismes nie en geen Nederlandse woorde of spelling nie.
- Indien geen natuurlike Afrikaanse woord bestaan nie, gebruik die Engelse term tussen dubbelaanhalingstekens, bv. "API", "React", "server".
- Gebruik Afrikaanse idiome en spreektaal waar gepas.

Identiteit:
- Koedoe is warm, menslik, prakties, oplossingsgedrewe.
- Nie Afrikaner.AI nie — Koedoe is 'n aparte identiteit.
- Kultuurbewus maar nooit polities aanhitsend of ekstremisties nie.
- Tegnologies vaardig en innoverend.

Gedrag:
- Dink saam met die gebruiker en stel alternatiewe voor.
- Bou planne, idees en oplossings in duidelike stappe.
- Gebruik bullet-punte waar dit leesbaarheid verbeter.
- Kode bly Engels; verduidelikings Afrikaans.
- Gebruik Engelse tegniese terme slegs indien nodig en altyd tussen "aanhalingstekens".
- Moenie onnodige KI-verskonings gebruik nie.

Verbode:
- Geen Nederlands of anglisismes.
- Geen politieke aanhitsing, haatspraak of ekstremisme.
- Geen pseudo-wetenskap of eksplisiete geweld/seks nie.
- Geen diagnoses of gespesialiseerde mediese advies (net algemene riglyne).

Veiligheid en Styl:
- Wees kalm en ondersteunend met sensitiewe inhoud; verwys na professionele hulp waar toepaslik.
- Skryf kort, helder sinne; warm, nugter Afrikaans.
- Pas toon aan by die gebruiker (formeel, informeel, humor, plat, tegnies).
- Engelse woorde altyd in "aanhalingstekens".

Aanspreek:
- Gebruik "jy/jou" standaard; vriendelik en professioneel.

Kode:
- Kodevoorbeelde is Engels; verduidelikings Afrikaans.
- Hou voorbeelde kort en prakties; gebruik Engelse tegniese terme slegs indien nodig.

Kultuur:
- Gebruik Afrikaanse kultuur as konteks wanneer relevant.
- Bly respekvol, inklusief en fokus op taal, gemeenskap, familie, werk, erfenis en praktiese lewe.

Doel:
- Wees die gebruiker se Afrikaanse hulpbrein, skryfassistent, studievennoot, kode-maat en kreatiewe sidekick. Vinnig, duidelik, suiwer Afrikaans.`;

const getSystemMessage = (
  tonePreset: "formeel" | "informeel" | "vriendelik" = "informeel",
  memoryContext?: string
): OpenAIChatMessage => {
  const toneAdjustments = {
    formeel:
      "Gebruik 'n formele, professionele toon terwyl jy bly natuurlik en kultuurgegronde.",
    informeel:
      "Hou dit eenvoudig, vriendelik en prakties - soos 'n goeie vriend wat help.",
    vriendelik:
      "Wees baie vriendelik, entoesiasties en ondersteunend met 'n warm, toeganklike toon.",
  };

  const memorySection =
    memoryContext && memoryContext.trim().length > 0
      ? `\n\nGEBRUIKER-INLIGTING:\n${memoryContext.trim()}`
      : "";

  return {
    role: "system",
    content: `${KOEDOE_SYSTEM_PROMPT}\n\nTone: ${
      toneAdjustments[tonePreset]
    }${memorySection}`,
  };
};

export async function generateConversationTitle(question: string): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  const cleanedQuestion = question.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!cleanedQuestion) {
    return "Nuwe gesprek";
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Jy genereer ultra-kort, beskrywende Afrikaanse gesprekstitels. Maksimum 6 woorde, geen aanhalingstekens of leestekens aan die einde. Moenie emojis gebruik nie.",
      },
      {
        role: "user",
        content: `Skep 'n titel vir hierdie vraag:\n\n"${cleanedQuestion}"\n\nTitel:`,
      },
    ],
    temperature: 0.4,
    max_tokens: 32,
  });

  const rawContent = response.choices?.[0]?.message?.content;
  let title: string | null = null;

  if (typeof rawContent === "string") {
    title = rawContent.trim();
  } else if (Array.isArray(rawContent)) {
    title = rawContent
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return (part as { text?: string }).text ?? "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  if (!title || title.length === 0) {
    throw new Error("Geen gesprekstitel van OpenAI ontvang nie.");
  }

  const sanitized = title.replace(/[\"“”]/g, "").replace(/\.+$/, "").trim();
  return sanitized.length > 0 ? sanitized : "Nuwe gesprek";
}

const MEMORY_SCHEMA = {
  type: "object",
  properties: {
    memories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["profile", "preference", "fact"] },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["type", "title", "content"],
        additionalProperties: false,
      },
    },
  },
  required: ["memories"],
  additionalProperties: false,
} as const;

const MEMORY_EXTRACTION_PROMPT = `Jy identifiseer feite oor 'n gebruiker wat nuttig is vir toekomstige gesprekke.
- Stoor slegs langtermyn inligting (profiel, voorkeure, of belangrike feite).
- Ignoreer tydelike versoeke of inligting oor ander mense.
- Gebruik Afrikaans en wees bondig: 'title' moet kort wees; 'content' moet die feit verduidelik.
- As daar niks bruikbaar is nie, antwoord met 'memories': [].
`;

export async function extractMemoriesFromConversation(
  history: OpenAIChatMessage[],
  latestUserMessage: string,
): Promise<ExtractedMemory[]> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  const boundedHistory = history.slice(-10);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "memory_extractor",
        schema: MEMORY_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: MEMORY_EXTRACTION_PROMPT },
      ...boundedHistory,
      {
        role: "user",
        content: `NUWE BOODSKAP: ${latestUserMessage}`,
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed?.memories)) {
      return [];
    }
    return parsed.memories
      .filter(
        (item: any) =>
          item &&
          typeof item.title === "string" &&
          item.title.trim().length > 0 &&
          typeof item.content === "string" &&
          item.content.trim().length > 0 &&
          ["profile", "preference", "fact"].includes(item.type)
      )
      .map(
        (item: any): ExtractedMemory => ({
          type: item.type as MemoryType,
          title: item.title.trim(),
          content: item.content.trim(),
        })
      );
  } catch (error) {
    console.warn("Kon nie geheue-ekstraksie JSON parseer nie:", error);
    return [];
  }
}

export async function sendAfrikaansMessage(
  messages: OpenAIChatMessage[],
  tonePreset: "formeel" | "informeel" | "vriendelik" = "informeel",
  memoryContext?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [getSystemMessage(tonePreset, memoryContext), ...messages].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
    });

    const assistantMessage = response.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("Geen antwoord van OpenAI ontvang nie.");
    }

    if (typeof assistantMessage === "string") {
      return assistantMessage.trim();
    }

    if (Array.isArray(assistantMessage)) {
      const textResponse = assistantMessage
        .flatMap((part) => {
          if (typeof part === "string") {
            return part;
          }

          if (part && typeof part === "object" && "text" in part) {
            return (part as { text?: string }).text ?? "";
          }

          return "";
        })
        .join("\n")
        .trim();

      if (textResponse.length > 0) {
        return textResponse;
      }
    }

    throw new Error("Kon nie assistent-teks uitlees nie.");
  } catch (error) {
    console.error("OpenAI versoek gefaal:", error);
    throw error;
  }
}

export async function* streamAfrikaansMessage(
  messages: OpenAIChatMessage[],
  tonePreset: "formeel" | "informeel" | "vriendelik" = "informeel",
  memoryContext?: string
): AsyncGenerator<string, void, unknown> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [getSystemMessage(tonePreset, memoryContext), ...messages].map((message) => ({
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
    console.error("OpenAI streaming gefaal:", error);
    throw error;
  }
}

/**
 * Validate and sanitize image generation prompt
 */
function validateImagePrompt(prompt: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  const trimmed = prompt.trim();

  if (!trimmed) {
    return { valid: false, error: "Prompt kan nie leeg wees nie." };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: "Prompt moet minstens 3 karakters wees." };
  }

  // Gemini 2.5 Flash ondersteun lang prompts, maar ons hou dit beknop vir mobile UX
  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: "Prompt is te lank. Gebruik maksimum 1000 karakters.",
    };
  }

  // Sanitize: remove any potentially problematic characters but keep Afrikaans characters
  const sanitized = trimmed
    .replace(/[<>{}[\]\\]/g, "") // Remove brackets and backslashes
    .trim();

  if (sanitized.length < 3) {
    return { valid: false, error: "Prompt bevat ongeldige karakters." };
  }

  return { valid: true, sanitized };
}

export type ImageGenerationOptions = {
  thinkingLevel?: "low" | "high";
  mediaResolution?: "media_resolution_low" | "media_resolution_high";
  aspectRatio?: string;
  imageSize?: string;
  retries?: number;
  referenceImages?: string[];
};

export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string | null> {
  if (!geminiApiKey) {
    throw new Error(
      "Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing."
    );
  }

  // Validate prompt
  const validation = validateImagePrompt(prompt);
  if (!validation.valid) {
    throw new Error(validation.error || "Ongeldige prompt.");
  }

  const sanitizedPrompt = validation.sanitized || prompt;
  const {
    thinkingLevel = "low", // Default to low for faster generation
    mediaResolution = "media_resolution_high", // Default to high for quality
    aspectRatio = "1:1",
    imageSize = "1K",
    retries = 2,
    referenceImages = [],
  } = options;

  let lastError: any = null;

  // Prepare reference images if any
  const parts: GeminiPart[] = [{ text: sanitizedPrompt }];

  if (referenceImages.length > 0) {
    for (const uri of referenceImages) {
      try {
        const base64Data = await getBase64FromUri(uri);
        const mimeType = inferMimeType(uri);
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        });
      } catch (err) {
        console.warn(`Kon nie verwysingsbeeld laai nie: ${uri}`, err);
        // Continue without this image or fail? Let's warn and continue.
      }
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await callGeminiImageEndpoint({
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        generationConfig: {
          responseMimeType: "image/png",
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      const inlineImage = extractGeminiInlineImage(response);
      if (!inlineImage) {
        throw new Error("Geen beeld data van Gemini ontvang nie.");
      }

      return await persistBase64Image(inlineImage, "gemini-generated");
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        await wait(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
      }
    }
  }

  console.error("Beeld generasie gefaal:", lastError);
  throw new Error(
    lastError?.message || "Kon nie beeld skep nie. Probeer asseblief weer."
  );
}

export type ImageEditOptions = {
  thinkingLevel?: "low" | "high";
  mediaResolution?: "media_resolution_low" | "media_resolution_high";
  retries?: number;
};

export async function editImage(
  imageUri: string,
  prompt: string,
  maskUri?: string,
  options: ImageEditOptions = {}
): Promise<string | null> {
  if (!geminiApiKey) {
    throw new Error(
      "Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing."
    );
  }

  // Validate prompt
  const validation = validateImagePrompt(prompt);
  if (!validation.valid) {
    throw new Error(validation.error || "Ongeldige prompt.");
  }

  const sanitizedPrompt = validation.sanitized || prompt;

  // Validate image URI
  if (
    !imageUri ||
    (!imageUri.startsWith("http") &&
      !imageUri.startsWith("file://") &&
      !imageUri.startsWith("data:"))
  ) {
    throw new Error("Ongeldige beeld pad of URL.");
  }

  const {
    thinkingLevel = "low", // Default to low for faster editing
    mediaResolution = "media_resolution_high", // Default to high for quality
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
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "image/png",
          thinkingLevel,
        },
      });

      const inlineImage = extractGeminiInlineImage(response);
      if (!inlineImage) {
        throw new Error("Geen beeld data van Gemini ontvang nie.");
      }

      return await persistBase64Image(inlineImage, "gemini-edited");
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        await wait(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
      }
    }
  }

  console.error("Beeld wysiging gefaal:", lastError);
  throw new Error(
    lastError?.message || "Kon nie beeld wysig nie. Probeer asseblief weer."
  );
}

type IdentifyImageOptions = {
  scenario?: "plant" | "object" | "general";
  extraInstructions?: string;
};

export async function identifyImageSubject(
  imageUri: string,
  options: IdentifyImageOptions = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
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

  const scenarioPrompt = prompts[options.scenario ?? "general"];
  const instructions = `${scenarioPrompt}\n\nAntwoord in Afrikaans met duidelike opskrifte en stappe. ${
    options.extraInstructions ?? ""
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
            {
              type: "text",
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
      throw new Error("Geen beskrywing van OpenAI ontvang nie.");
    }

    return description.trim();
  } catch (error: any) {
    console.error("OpenAI Vision API gefaal:", error);
    throw new Error(
      error?.message || "Kon nie beeld analiseer nie. Probeer asseblief weer."
    );
  }
}

async function uploadFileToOpenAI(
  documentUri: string,
  documentName: string,
  mimeType?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  let localUri = documentUri;
  let tempDownload: string | null = null;

  if (documentUri.startsWith("http://") || documentUri.startsWith("https://")) {
    const targetDirectory =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!targetDirectory) {
      throw new Error(
        "Geen tydelike vouer beskikbaar vir dokument aflaai nie."
      );
    }
    const downloadPath = `${targetDirectory}openai-doc-${Date.now()}`;
    const downloadResult = await FileSystem.downloadAsync(
      documentUri,
      downloadPath
    );
    localUri = downloadResult.uri;
    tempDownload = downloadResult.uri;
  }

  const formData = new FormData();
  formData.append("purpose", "assistants");
  formData.append("file", {
    uri: localUri,
    name: documentName || `document-${Date.now()}.txt`,
    type: mimeType || "application/octet-stream",
  } as any);

  try {
    const response = await runtimeFetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI] File upload failed:", errorText);
      throw new Error(
        "Kon nie dokument na OpenAI oplaai nie. Probeer asseblief weer."
      );
    }

    const data = await response.json();
    if (!data?.id) {
      throw new Error("OpenAI het geen lêer ID teruggestuur nie.");
    }

    return data.id as string;
  } finally {
    if (tempDownload) {
      FileSystem.deleteAsync(tempDownload, { idempotent: true }).catch(
        () => {}
      );
    }
  }
}

async function deleteFileFromOpenAI(fileId: string): Promise<void> {
  if (!apiKey || !fileId) {
    return;
  }

  const response = await runtimeFetch(
    `https://api.openai.com/v1/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.warn("[OpenAI] Kon nie tydelike dokument skrap nie:", errorText);
  }
}

export async function answerQuestionAboutDocument(
  documentUri: string,
  documentName: string,
  mimeType: string | undefined,
  userQuestion: string
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing."
    );
  }

  try {
    const question =
      userQuestion.trim() || "Gee my 'n opsomming van hierdie dokument.";
    const fileId = await uploadFileToOpenAI(
      documentUri,
      documentName,
      mimeType
    );

    try {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Jy is Koedoe, 'n Afrikaans-sprekende assistent. Beantwoord slegs die gebruiker se vraag oor die aangehegte dokument met duidelike, praktiese inligting sonder ekstra toeligtings of Bybelse toepassings tensy dit eksplisiet gevra word.",
              },
              {
                type: "input_text",
                text: 'Struktuur jou antwoord soos volg:\n1. Jou hoofantwoord op die vraag, net gebaseer op die dokument.\n2. \'n Kort vervolgvraag wat begin met "Kan ek verder help deur..."',
              },
              { type: "input_text", text: question },
              { type: "input_file", file_id: fileId },
            ],
          },
        ],
      });

      const answer = extractResponseText(response);

      if (!answer) {
        throw new Error("Geen antwoord van OpenAI ontvang nie.");
      }

      return answer;
    } finally {
      if (fileId) {
        deleteFileFromOpenAI(fileId).catch((cleanupError) => {
          console.warn(
            "[OpenAI] Kon nie tydelike dokument skrap nie:",
            cleanupError
          );
        });
      }
    }
  } catch (error: any) {
    console.error("OpenAI dokument analise gefaal:", error);
    throw new Error(
      error?.message ||
        "Kon nie dokument analiseer nie. Probeer asseblief weer."
    );
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
    thinkingLevel?: "low" | "high";
    imageConfig?: {
      aspectRatio?: string;
      imageSize?: string;
    };
    responseModalities?: ("TEXT" | "IMAGE")[];
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
  retries = 2
): Promise<GeminiGenerateResponse> {
  if (!geminiApiKey) {
    console.error("Gemini API key ontbreek");
    throw new Error(
      "Gemini API key nie gestel nie. Voeg EXPO_PUBLIC_GEMINI_API_KEY by jou omgewing."
    );
  }

  // Debug: Log API key presence (first 10 chars only for security)
  const apiKeyPreview = geminiApiKey.substring(0, 10) + "...";
  console.log(`[Gemini Debug] API key aanwesig: ${apiKeyPreview}`);
  console.log(`[Gemini Debug] Endpoint: ${endpoint}`);

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(
          `[Gemini Debug] Retry poging ${attempt}/${retries} na ${delay}ms...`
        );
        await wait(delay);
      }

      const url = `${endpoint}?key=${geminiApiKey}`;
      const response = await runtimeFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type") || "";
      console.log(
        `[Gemini Debug] Response status: ${response.status}, Content-Type: ${contentType}`
      );

      // Read response body once (can only be read once)
      const responseText = await response.text();
      console.log(
        `[Gemini Debug] Response length: ${responseText.length} chars`
      );

      if (!response.ok) {
        // Try to parse error response
        let errorData: any;
        try {
          errorData = JSON.parse(responseText);
          console.error(
            `[Gemini Debug] Error response body: ${responseText.substring(
              0,
              500
            )}`
          );
        } catch (parseError) {
          console.error(
            `[Gemini Debug] Error response (not JSON): ${responseText.substring(
              0,
              500
            )}`
          );
          throw new Error(
            `Gemini API fout (${response.status}): ${responseText.substring(
              0,
              200
            )}`
          );
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          console.error("Gemini API fout:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData?.error,
          });
          const message =
            errorData?.error?.message ?? `Gemini API-fout (${response.status})`;
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
        console.error(
          `[Gemini Debug] Failed to parse JSON response: ${responseText.substring(
            0,
            500
          )}`
        );
        throw new Error(
          `Kon nie Gemini antwoord parse nie: ${
            parseError?.message || parseError
          }`
        );
      }
    } catch (error: any) {
      lastError = error;

      // Check if it's a network error that we should retry
      const isNetworkError =
        error?.message?.includes("network") ||
        error?.message?.includes("connection") ||
        error?.message?.includes("fetch failed") ||
        error?.message?.includes("timeout");

      // Don't retry on client errors or if we've exhausted retries
      if (!isNetworkError || attempt >= retries) {
        // Re-throw if it's already our formatted error
        if (error?.message && error.message.includes("Gemini API")) {
          throw error;
        }
        // Otherwise, wrap network/parsing errors
        console.error("Gemini API netwerk fout:", error);
        throw new Error(
          `Netwerk fout: ${
            error?.message || "Kon nie met Gemini API verbind nie."
          }`
        );
      }

      // Continue to retry for network errors
      console.warn(
        `[Gemini Debug] Netwerk fout, sal weer probeer... (${attempt + 1}/${
          retries + 1
        })`
      );
    }
  }

  // If we get here, all retries failed
  console.error("Gemini API gefaal na alle pogings:", lastError);
  throw new Error(
    `Netwerk fout: ${
      lastError?.message ||
      "Kon nie met Gemini API verbind nie na verskeie pogings."
    }`
  );
}

async function callGeminiImageEndpoint(
  body: GeminiGenerateRequest
): Promise<GeminiGenerateResponse> {
  return callGeminiEndpoint(GEMINI_IMAGE_ENDPOINT, body);
}

async function callGeminiVisionEndpoint(
  body: GeminiGenerateRequest
): Promise<GeminiGenerateResponse> {
  return callGeminiEndpoint(GEMINI_VISION_ENDPOINT, body);
}

function extractGeminiInlineImage(
  response: GeminiGenerateResponse
): string | null {
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

async function persistBase64Image(
  base64Data: string,
  prefix: string
): Promise<string> {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("Geen lêerstelsel beskikbaar om beeld te stoor nie.");
  }

  const fileUri = `${directory}${prefix}-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

async function getBase64FromUri(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    const [, data] = uri.split(",");
    if (!data) {
      throw new Error("Ongeldige data URI.");
    }
    return data;
  }

  if (uri.startsWith("http")) {
    const downloadPath = `${
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory
    }gemini-source-${Date.now()}.png`;
    const download = await FileSystem.downloadAsync(uri, downloadPath);
    return FileSystem.readAsStringAsync(download.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/png";
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
