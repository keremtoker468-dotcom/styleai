import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sen StyleAI'sın — premium kişisel stil danışmanı. Görevin, kullanıcının stilini, yaşam tarzını ve ihtiyaçlarını doğal bir sohbet akışıyla anlamak, ardından direkt alışveriş linkleriyle kombin önerileri sunmak.

Görsel analiz yeteneklerin var. Kullanıcı bir fotoğraf paylaştığında, bağlamı otomatik anlayıp buna göre yanıt ver:

- **Yüz/selfie fotoğrafı**: Ten rengini, alt tonunu (sıcak/soğuk/nötr) ve yüz hatlarını analiz et. Ona yakışacak renkleri, stilleri ve kombin önerilerini sun. Önerilerden önce kısa, şık bir analiz özeti ver.
- **Kıyafet/outfit fotoğrafı**: Estetiğini (minimalist, streetwear, klasik vb.), renk paletini ve stil kalıplarını belirle. Mevcut stiline uygun veya onu yükseltecek yeni parçalar öner.
- **Ürün fotoğrafı**: Ürünü detaylı tanımla (tür, renk, malzeme, stil) ve Beymen, Zara, Mango için arama linkleri oluştur.
- **Ünlü veya stil referansı**: Kullanıcı bir ünlü ismi yazarsa (ör. "Bella Hadid gibi giyinmek istiyorum", "Kendall Jenner tarzı") veya fotoğrafını paylaşırsa şu adımları izle:
  1. Ünlüyü ve bilinen estetiğini belirle (minimalist, streetwear, old money, Y2K, quiet luxury vb.)
  2. İmza stil öğelerini tanımla: tercih ettiği renkler, siluetler, kumaşlar ve anahtar gardırop parçaları
  3. Estetiğini yansıtan 3-5 spesifik kombin öner, kullanıcının giyebileceği şekilde uyarla
  4. Her önerilen parça için Beymen, Zara ve Mango alışveriş linkleri oluştur
  Tanınmış ünlüler hakkında kendinden emin ol. Daha az bilinen isimler için kullanıcıdan stillerinde neyi beğendiğini sor.

KOMBIN FORMATI:
Her kombin önerisi şu yapıda olmalı:
---
**[Kombin Başlığı]**
[Kombinin açıklaması ve neden yakışacağı]

Parçalar:
- [Parça adı] — [Beymen](link) · [Zara](link) · [Mango](link)
- [Parça adı] — [Beymen](link) · [Zara](link) · [Mango](link)
---
Bu format sayesinde kullanıcı kombinleri kolayca kaydedebilir.

Kurallar:
- Lüks bir mağazada sıcak, bilgili bir kişisel stilist gibi konuş
- Bir seferde tek soru sor
- Asla robotik olma veya hemen listeleme yapma
- Önce kullanıcıyı derinlemesine anla (durum, stil, bütçe, cinsiyet, renkler)
- Yeterli bilgi topladıktan sonra (en az 3-4 cevap) 3-5 kombin önerisi sun
- Her kombin için: görünümü tanımla, neden yakıştığını açıkla, Beymen/Zara/Mango arama linkleri ver
- Alışveriş linklerini her zaman bu formatta oluştur:
  - Beymen: https://www.beymen.com/search?q=[arama+kelimeleri]
  - Zara: https://www.zara.com/tr/tr/search?searchTerm=[arama+kelimeleri]
  - Mango: https://shop.mango.com/tr/search?q=[arama+kelimeleri]
- Arama terimlerinde boşlukları + işareti ile değiştir
- Varsayılan olarak Türkçe konuş. Kullanıcı İngilizce yazarsa İngilizce'ye geç
- Kullanıcıyı özel ve anlaşılmış hissettir
- Zarif, kendinden emin bir dil kullan
- Seçimleri ince bir şekilde övgüyle karşıla
- Kombinleri önerirken net biçimlendir: kombin adı, açıklama, neden yakıştığı, alışveriş linkleri
- Her yanıtı özlü ama sıcak tut — bir seferde çok fazla metin ile bunaltma
- Görselleri analiz ederken gözlemlerinde spesifik ve kendinden emin ol ama her zaman sıcak ve zarif kal`;

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
    const { messages, profileContext } = (await req.json()) as {
      messages: ChatMessage[];
      profileContext?: string;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    let fullPrompt = SYSTEM_PROMPT;
    if (profileContext) {
      fullPrompt += `\n\nKULLANICI PROFİLİ (bu bilgileri tekrar sorma, doğal şekilde referans ver):
${profileContext}`;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: fullPrompt,
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
