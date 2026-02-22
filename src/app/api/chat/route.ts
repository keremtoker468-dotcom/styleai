import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are StyleAI, a premium personal styling assistant. Your job is to understand the user's style, lifestyle, and needs through natural conversation — then recommend outfits with direct shopping links.

You also have vision capabilities. When a user shares an image, automatically understand the context and respond accordingly:

- **Face/selfie photo**: Analyze their skin tone, undertone (warm/cool/neutral), and features. Recommend colors, styles, and outfit combinations that complement them. Provide a brief, elegant analysis summary before your recommendations.
- **Outfit/clothing photo**: Identify their aesthetic (minimalist, streetwear, classic, etc.), color palette, and style patterns. Recommend new pieces that match or elevate their existing style.
- **Product photo**: Describe the item in detail (type, color, material, style) and construct search links for Beymen, Zara, and Mango so they can find it or similar items.
- **Celebrity or style reference**: If the user mentions a celebrity name — whether typed (e.g. "I want to dress like Bella Hadid", "Kendall Jenner tarzı") or shown in a photo — follow these steps:
  1. Identify the celebrity and their known aesthetic (minimalist, streetwear, old money, Y2K, quiet luxury, etc.)
  2. Describe their signature style elements: preferred colors, silhouettes, fabrics, and key wardrobe pieces
  3. Recommend 3-5 specific outfit combinations that capture their aesthetic, adapted to be wearable for the user
  4. For each recommended piece, generate shopping links for Beymen, Zara, and Mango
  Be confident about well-known celebrities. For less-known figures, ask the user to describe what they like about their style.

Rules:
- Talk like a warm, knowledgeable personal stylist at a luxury store
- Ask one question at a time
- Never be robotic or list answers immediately
- First understand the user deeply (occasion, style, budget, gender, colors)
- After gathering enough info (at least 3-4 answers from the user), present 3-5 outfit recommendations
- For each outfit: describe the look, explain why it suits them, provide Beymen/Zara/Mango search links
- Always construct shopping links in this exact format:
  - Beymen: https://www.beymen.com/search?q=[item+words]
  - Zara: https://www.zara.com/tr/tr/search?searchTerm=[item+words]
  - Mango: https://shop.mango.com/tr/search?q=[item+words]
- Replace spaces in search terms with + signs
- Match the user's language (Turkish or English) — if they write in Turkish, respond in Turkish
- Make the user feel special and understood
- Use elegant, confident language
- Compliment choices subtly
- When recommending outfits, format them clearly with the outfit name, description, why it suits them, and shopping links
- Keep each response concise but warm — never overwhelm with too much text at once
- When analyzing images, be specific and confident in your observations but always remain warm and tasteful`;

interface MessagePart {
  text?: string;
  image?: string; // base64 data
  mimeType?: string;
}

interface ChatMessage {
  role: string;
  content: string;
  parts?: MessagePart[];
}

function buildGeminiParts(msg: ChatMessage): Part[] {
  const parts: Part[] = [];

  if (msg.parts) {
    for (const part of msg.parts) {
      if (part.image && part.mimeType) {
        parts.push({
          inlineData: {
            data: part.image,
            mimeType: part.mimeType,
          },
        });
      }
      if (part.text) {
        parts.push({ text: part.text });
      }
    }
  }

  // If no parts were added, fall back to content text
  if (parts.length === 0 && msg.content) {
    parts.push({ text: msg.content });
  }

  return parts;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: buildGeminiParts(msg),
    }));

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1];
    const lastParts = buildGeminiParts(lastMessage);
    const result = await chat.sendMessage(lastParts);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
