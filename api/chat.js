import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


export default async function handler(
  req,
  res
) {

  /* =====================================
     ONLY POST
  ===================================== */

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }


  /* =====================================
     CHECK API KEY
  ===================================== */

  if (!process.env.OPENAI_API_KEY) {

    return res.status(500).json({

      error:
        "OPENAI_API_KEY is not configured in Vercel."

    });

  }


  try {

    const {
      message,
      language
    } = req.body || {};


    /* =====================================
       CHECK MESSAGE
    ===================================== */

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {

      return res.status(400).json({

        error:
          "Message is required."

      });

    }


    /* =====================================
       LANGUAGE
    ===================================== */

    const languageNames = {

      am:
        "Amharic",

      om:
        "Afaan Oromoo",

      ar:
        "Arabic",

      en:
        "English"

    };


    const selectedLanguage =
      languageNames[language] ||
      "Amharic";


    /* =====================================
       ISLAMIC AI INSTRUCTIONS
    ===================================== */

    const instructions = `

You are Jemal Muslim AI, an Islamic educational assistant.

Your main purpose is to help users learn about Islam.

The user selected language is:
${selectedLanguage}

IMPORTANT LANGUAGE RULE:
Answer primarily in the selected language.
If the user asks in another language, understand the question and answer clearly.
For Quran verses and authentic Hadith, preserve Arabic text when useful and provide the requested translation.

ISLAMIC GUIDELINES:

1. Use the Quran and authentic Sunnah as primary sources.

2. When giving a Quran verse:
   - Give the Arabic when appropriate.
   - Mention the Surah name and Ayah number.

3. When giving a Hadith:
   - Mention the collection/source when known.
   - Do not invent Hadith.
   - If authenticity is uncertain, clearly say so.

4. For Islamic legal questions:
   - Explain differences between recognized Sunni scholarly opinions when they exist.
   - Do not pretend there is consensus when there is legitimate disagreement.

5. Do not invent Quran verses, Hadith, scholars, or references.

6. Be respectful and educational.

7. Keep answers understandable for ordinary Muslims.

8. For sensitive matters, encourage consultation with a qualified local scholar when appropriate.

9. Never claim to be a human scholar.

10. Your name is:
Jemal Muslim AI

Answer the user's question now.
`;


    /* =====================================
       OPENAI RESPONSES API
    ===================================== */

    const response =
      await client.responses.create({

        model:
          "gpt-6-luna",

        instructions:
          instructions,

        input:
          message.trim(),

        max_output_tokens:
          1800

      });


    /* =====================================
       GET TEXT
    ===================================== */

    const answer =
      response.output_text;


    if (
      !answer ||
      !answer.trim()
    ) {

      return res.status(500).json({

        error:
          "OpenAI returned an empty response."

      });

    }


    /* =====================================
       SEND RESPONSE
    ===================================== */

    return res.status(200).json({

      reply:
        answer.trim()

    });


  } catch (error) {

    console.error(
      "OpenAI API Error:",
      error
    );


    return res.status(500).json({

      error:
        error?.message ||
        "AI request failed."

    });

  }

}
