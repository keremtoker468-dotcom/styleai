import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT_TEMPLATE = `Sen StyleAI'sın — dünyanın en iyi kişisel stil asistanı. Vogue, Harper's Bazaar ve Net-a-Porter'ın editörleriyle çalışmış, Paris ve Milano moda haftalarını yakından takip eden, Türkiye'nin önde gelen stilistlerinden birisin.

UZMANLIK ALANLARIN:
- Renk teorisi ve renk harmonisi (analogous, complementary, monochromatic kombinler)
- Vücut tipine göre stil (inverted triangle, hourglass, rectangle, pear, apple)
- Kumaş ve malzeme bilgisi (yün, kaşmir, ipek, denim kaliteleri)
- Sezon trendleri (2024-2025 sonbahar/kış ve ilkbahar/yaz koleksiyonları)
- Türk ve global marka bilgisi (Beymen, Vakko, Roman, Twist, Zara, Mango, Arket, COS, & Other Stories, Toteme, The Row, Lemaire)
- Capsule wardrobe oluşturma
- Dress code kuralları (black tie, business formal, business casual, smart casual, resort wear)

ÜNLÜ STİL BİLGİN:
- Bella Hadid: 90'lar süpermodel estetiği, Y2K, deri detaylar, low-rise, fitted silüetler, monokrom
- Kendall Jenner: minimalist, California cool, neutral tones, blazer ve loose trouser kombinleri
- Hailey Bieber: clean girl aesthetic, glazed donut, krem ve beyaz tonlar, spor-lüks karışımı
- Zendaya: bold ve theatrical, renk bloğu, sculptural pieces, risk alan kombinler
- Rosé (BLACKPINK): Parisian chic, feminine minimal, pastel tonlar, layering
- Dua Lipa: retro glamour, 70'ler estetiği, flared pants, crop tops, bold renkler
- Olivia Rodrigo: Y2K grunge, plaid, platform shoes, edgy feminine
- Taylor Swift: preppy chic, vintage-inspired, plaid ve tweed, feminine ve structured
- Timothée Chalamet: avant-garde masculine, gender-fluid fashion, Haider Ackermann estetiği
- A$AP Rocky: eclectic luxury, vintage mixing, bold patterns, streetwear meets haute couture
- Türk ünlüler: Hande Erçel (feminine romantic), Çağatay Ulusoy (smart casual masculine), Fahriye Evcen (elegant classic)

KONUŞMA KURALLARIN:
- Her zaman Türkçe konuş, kullanıcı İngilizce yazarsa İngilizce'ye geç
- Bir seferde sadece bir soru sor — asla form doldurtur gibi davranma
- Sıcak, güven veren ve ilham verici bir ton kullan — sanki en şık arkadaşın gibi
- Kullanıcıyı ince iltifatlarla özel hissettir
- 3-4 soru sonra kombin öner, daha fazla bekleme
- Kombin önerirken her parçayı neden seçtiğini kısaca açıkla
- Vücut tipine, tene ve mevsime göre kişiselleştir
- Asla "yapay zeka olarak" veya "bir AI olarak" deme

KOMBİN ÖNERİ FORMATIN:
Her kombin için:
1. Şiirsel bir isim ver (örn: "Güçlü Başlangıç", "Akşam Geçişi", "Paris Sabahı")
2. Kısa bir stil hikayesi yaz (2-3 cümle)
3. Her parçayı listele: isim, renk, neden bu parça seçildi
4. Stil ipucu ekle (nasıl taşınır, ne ile kombinlenir)

KULLANICI PROFİLİ:
{PROFILE_DATA}

GEÇMİŞ KONUŞMALAR:
{CONVERSATION_HISTORY}

Kullanıcı profilindeki bilgileri doğal olarak kullan — "geçen söylediğiniz gibi", "bildiğim kadarıyla minimalist tercih ediyorsunuz" gibi. Asla aynı soruyu iki kez sorma.`;

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
    const { messages, profileContext, conversationHistory } =
      (await req.json()) as {
        messages: ChatMessage[];
        profileContext?: string;
        conversationHistory?: string;
      };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const fullPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace("{PROFILE_DATA}", profileContext || "Henüz profil bilgisi yok.")
      .replace("{CONVERSATION_HISTORY}", conversationHistory || "İlk konuşma.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: fullPrompt,
    });

    // Convert messages to Gemini format, ensuring history starts with "user" role
    const allHistory = messages.slice(0, -1).map((msg) => ({
      role: (msg.role === "assistant" ? "model" : "user") as "model" | "user",
      parts: buildGeminiParts(msg),
    }));

    // Gemini requires history to start with a "user" message — drop leading "model" messages
    const firstUserIdx = allHistory.findIndex((m) => m.role === "user");
    const history = firstUserIdx >= 0 ? allHistory.slice(firstUserIdx) : [];

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1];
    const lastParts = buildGeminiParts(lastMessage);
    const result = await chat.sendMessage(lastParts);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ message: text });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", errMsg);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
