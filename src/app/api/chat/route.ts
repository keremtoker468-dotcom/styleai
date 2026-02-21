import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are StyleAI, a premium personal styling assistant. Your job is to understand the user's style, lifestyle, and needs through natural conversation — then recommend outfits with direct shopping links.

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
- Keep each response concise but warm — never overwhelm with too much text at once`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

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
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
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
