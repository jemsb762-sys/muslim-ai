export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message, language } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        instructions: `
You are Muslim AI, an Islamic educational assistant.

Answer respectfully and accurately.

Languages:
- am = Amharic
- om = Afaan Oromoo
- ar = Arabic

Always answer in the language requested by the user.

For Qur'an, Hadith, Tafsir and Islamic rulings:
- Do not invent Qur'an verses or Hadith.
- Clearly distinguish Qur'an, authentic Hadith, scholarly explanation, and your own general explanation.
- When you are uncertain, say so.
- Do not present a personal opinion as a religious ruling.
        `,
        input: `Language: ${language || "am"}

User question:
${message}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    return res.status(200).json({
      reply: data.output_text || "No response was generated."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}
