import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!geminiApiKey && !openaiApiKey) {
    return res.status(500).json({
      error: "Server API key is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in your environment variables."
    });
  }

  const { message, language } = req.body || {};
  const allowedLanguages = ["am", "om", "ar"];

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  if (message.length > 4000) {
    return res.status(400).json({
      error: "Your question is too long."
    });
  }

  const lang = allowedLanguages.includes(language)
    ? language
    : "am";

  const languageNames = {
    am: "Amharic",
    om: "Afaan Oromoo",
    ar: "Arabic"
  };

  const instructions = `
You are Muslim AI, an Islamic educational assistant.
Answer in ${languageNames[lang]}.

Be respectful, clear, and helpful.
Answer general questions about Islam, Qur'an,
Hadith, Tafsir, worship, and Islamic history.

Important rules:
- Never invent Qur'an verses or Hadith.
- Never invent source references or hadith numbers.
- Distinguish verified scripture from explanation.
- If unsure about authenticity or a ruling, say so.
- Explain that complex religious rulings should be
  checked with a qualified scholar.
- Do not claim to be a Mufti or a religious authority.
- Use simple language and organized answers.
`;

  try {
    if (geminiApiKey) {
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message.trim(),
        config: {
          systemInstruction: instructions,
        },
      });

      const reply = response.text?.trim();

      if (!reply) {
        return res.status(502).json({
          error: "The AI returned no text. Please retry."
        });
      }

      return res.status(200).json({ reply });
    }

    // Fallback to OpenAI if OPENAI_API_KEY is provided and GEMINI_API_KEY is not
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions,
          input: message.trim(),
          max_output_tokens: 900,
          store: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return res.status(502).json({
        error: response.status === 401
          ? "Invalid API key. Check settings."
          : response.status === 429
          ? "API limit or quota reached. Check billing."
          : "AI service error. Please try again."
      });
    }

    const reply = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "The AI returned no text. Please retry."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Backend error:", error.message);
    return res.status(500).json({
      error: "Server error. Please try again."
    });
  }
}
