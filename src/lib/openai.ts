import OpenAI from 'openai';
import { fetch as expoFetch } from 'expo/fetch';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key ontbreek. Stel EXPO_PUBLIC_OPENAI_API_KEY in jou omgewingsveranderlikes.');
}

const openai = new OpenAI({
  apiKey: apiKey ?? '',
  dangerouslyAllowBrowser: true,
  fetch: expoFetch,
});

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

export async function generateImage(prompt: string): Promise<string | null> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('Geen beeld URL ontvang nie.');
    }

    return imageUrl;
  } catch (error) {
    console.error('Beeld generasie gefaal:', error);
    throw error;
  }
}

export async function editImage(imageUri: string, prompt: string, maskUri?: string): Promise<string | null> {
  if (!apiKey) {
    throw new Error('OpenAI API key nie gestel nie. Voeg EXPO_PUBLIC_OPENAI_API_KEY by jou omgewing.');
  }

  try {
    const imageResponse = await fetch(imageUri);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });

    let maskFile: File | undefined;
    if (maskUri) {
      const maskResponse = await fetch(maskUri);
      const maskBlob = await maskResponse.blob();
      maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
    }

    const response = await openai.images.edit({
      image: imageFile,
      mask: maskFile,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('Geen beeld URL ontvang nie.');
    }

    return imageUrl;
  } catch (error) {
    console.error('Beeld wysiging gefaal:', error);
    throw error;
  }
}

