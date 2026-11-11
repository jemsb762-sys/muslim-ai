
import admin from "firebase-admin";

/* FIREBASE */

function getFirebase() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!raw || !databaseURL) {
    throw new Error("Firebase environment variables are missing.");
  }

  const serviceAccount = JSON.parse(raw);

  serviceAccount.private_key =
    serviceAccount.private_key?.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });

  return admin;
}

/* REMOVE CONSECUTIVE DUPLICATE LINES */

function removeConsecutiveDuplicateLines(text) {
  const lines = text.split(/\r?\n/);
  const cleaned = [];
  let previous = "";

  for (const line of lines) {
    const normalized = line.trim().toLocaleLowerCase();

    if (normalized && normalized === previous) {
      continue;
    }

    cleaned.push(line);
    previous = normalized;
  }

  return cleaned.join("\n").trim();
}

/* REFUND CREDIT IF AI REQUEST FAILS */

async function refundCredit(db, uid, type) {
  await db.ref(`users/${uid}`).transaction((user) => {
    if (!user) return user;

    if (type === "free") {
      user.freeUsed = Math.max(
        0,
        (Number(user.freeUsed) || 0) - 1
      );
    } else if (type === "paid") {
      user.paidCredits =
        (Number(user.paidCredits) || 0) + 1;
    }

    return user;
  });
}

/* MAIN API */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing from Vercel."
    });
  }

  let db;
  let uid;
  let creditType;

  try {
    const firebase = getFirebase();

    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        error: "Please sign in first."
      });
    }

    const decoded =
      await firebase.auth().verifyIdToken(token);

    uid = decoded.uid;
    db = firebase.database();

    const { message, language } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    /* CREDIT SYSTEM */

    const userRef = db.ref(`users/${uid}`);

    const reservation = await userRef.transaction((user) => {
      user = user || {
        freeUsed: 0,
        paidCredits: 0
      };

      user.freeUsed = Number(user.freeUsed) || 0;
      user.paidCredits = Number(user.paidCredits) || 0;

      if (user.freeUsed < 5) {
        user.freeUsed++;
        user.lastCreditType = "free";
        user.lastQuestionAt = Date.now();
        return user;
      }

      if (user.paidCredits > 0) {
        user.paidCredits--;
        user.lastCreditType = "paid";
        user.lastQuestionAt = Date.now();
        return user;
      }

      return;
    });

    if (!reservation.committed) {
      const current = (await userRef.get()).val() || {};

      return res.status(402).json({
        error: "PAYMENT_REQUIRED",
        message:
          "Your free questions are finished. Please pay 20 birr for 10 more questions.",
        freeUsed: current.freeUsed || 0,
        paidCredits: current.paidCredits || 0
      });
    }

    creditType =
      reservation.snapshot.val().lastCreditType;

    /* LANGUAGE */

    const languageNames = {
      am: "Amharic",
      om: "Afaan Oromoo",
      ar: "Arabic",
      en: "English"
    };

    const selectedLanguage =
      languageNames[language] || "Amharic";

    /* AI INSTRUCTIONS */

    const instructions = `
You are Jemal Muslim AI.

You are an Islamic educational assistant.
Answer Islamic questions only.

If a question is not about Islam, politely explain that you only answer Islamic questions.

Answer ONLY in ${selectedLanguage}.
If the user selects Afaan Oromoo, write natural, correct, clear Afaan Oromoo.
Use proper Afaan Oromoo vocabulary and grammar.
Do not mix languages unnecessarily.

Use the Quran and authentic Sunnah.
Give Quran references when quoting verses.
Give Hadith sources and grades when known.
Never invent Quran verses, Hadith or references.
Explain recognized Sunni scholarly differences fairly.
Be respectful and educational.
Never claim to be a human scholar.

IMPORTANT ANSWER QUALITY:
- Answer the exact question directly.
- Never repeat the same sentence, phrase, paragraph, or list item.
- Never fill the answer by repeating one phrase.
- Do not produce long repetitive lists.
- Use clear paragraphs and helpful headings when appropriate.
- Keep answers focused and useful.
- If you do not know something, say so honestly.
- Do not invent religious evidence.
- Use readable formatting.
- Your name is Jemal Muslim AI.
`;

    /* GROQ REQUEST */

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-120b",

          messages: [
            {
              role: "system",
              content: instructions
            },
            {
              role: "user",
              content: message.trim()
            }
          ],

          max_completion_tokens: 1800,
          temperature: 0.4
        })
      }
    );

    const result = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", result);

      throw new Error(
        result?.error?.message ||
        `Groq API request failed (${groqResponse.status}).`
      );
    }

    const answer =
      result?.choices?.[0]?.message?.content;

    if (
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      throw new Error("Groq returned an empty response.");
    }

    /* CLEAN ANSWER */

    const cleanAnswer =
      removeConsecutiveDuplicateLines(answer);

    if (!cleanAnswer) {
      throw new Error(
        "Groq returned an empty response after cleanup."
      );
    }

    /* SUCCESS RESPONSE */

    const current = (await userRef.get()).val() || {};

    return res.status(200).json({
      reply: cleanAnswer,
      freeUsed: current.freeUsed || 0,
      paidCredits: current.paidCredits || 0
    });

  } catch (error) {
    console.error("Chat API error:", error);

    if (db && uid && creditType) {
      try {
        await refundCredit(db, uid, creditType);
      } catch (refundError) {
        console.error(
          "Credit refund error:",
          refundError
        );
      }
    }

    return res.status(500).json({
      error: error?.message || "AI request failed."
    });
  }
}
