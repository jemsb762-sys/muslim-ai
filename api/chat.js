
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message, language } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Question is too long."
      });
    }

    const langMap = {
      am: "Amharic",
      om: "Afaan Oromoo",
      ar: "Arabic"
    };

    const lang = langMap[language] || "Amharic";
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Server API key is not configured."
      });
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content: `You are Muslim AI, an Islamic educational assistant.
Answer in ${lang}.
Use the Quran, authentic Hadith, and recognized Islamic scholarship.
Cite Quran surah and ayah numbers, and Hadith collections
and references whenever known.
Never fabricate Quran verses, Hadith, or religious rulings.
If you are unsure, clearly state that you are unsure.
Explain differences among recognized scholars fairly.
For complex fatwa matters, recommend consulting a
qualified local scholar. Be respectful, clear, and helpful.`
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        })
      }
    );

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("OpenAI error:", result);
      return res.status(502).json({
        error: "AI service error. Please try again later."
      });
    }

    const reply = result.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat backend error:", error);

    return res.status(500).json({
      error: "Server error. Please try again."
    });
  }
};
