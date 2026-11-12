
import admin from "firebase-admin";
import OpenAI from "openai";

function getFirebase() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!raw || !databaseURL) {
    throw new Error("Firebase server configuration is missing.");
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

async function refundCredit(db, uid, type) {
  await db.ref(`users/${uid}`).transaction(user => {
    if (!user) return user;

    if (type === "free") {
      user.freeUsed = Math.max(0, (Number(user.freeUsed) || 0) - 1);
    } else {
      user.paidCredits = (Number(user.paidCredits) || 0) + 1;
    }

    return user;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is missing in Vercel."
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
      return res.status(401).json({ error: "Please sign in first." });
    }

    const decoded = await firebase.auth().verifyIdToken(token);
    uid = decoded.uid;
    db = firebase.database();

    const { message, language } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: "Question is too long." });
    }

    const userRef = db.ref(`users/${uid}`);

    const reservation = await userRef.transaction(user => {
      user = user || { freeUsed: 0, paidCredits: 0 };

      user.freeUsed = Number(user.freeUsed) || 0;
      user.paidCredits = Number(user.paidCredits) || 0;

      if (user.freeUsed < 5) {
        user.freeUsed++;
        user.lastCreditType = "free";
        return user;
      }

      if (user.paidCredits > 0) {
        user.paidCredits--;
        user.lastCreditType = "paid";
        return user;
      }

      return;
    });

    if (!reservation.committed) {
      const current = (await userRef.get()).val() || {};

      return res.status(402).json({
        error: "PAYMENT_REQUIRED",
        message: "Your free questions are finished. Pay 20 ETB for 10 more questions.",
        freeUsed: current.freeUsed || 0,
        paidCredits: current.paidCredits || 0
      });
    }

    creditType = reservation.snapshot.val().lastCreditType;

    const languages = {
      am: "Amharic",
      om: "Afaan Oromoo",
      ar: "Arabic",
      en: "English"
    };

    const selectedLanguage = languages[language] || "Amharic";

    const instructions = `
You are Jemal Muslim AI.

You are an Islamic educational assistant.
Answer Islamic questions only.

For questions unrelated to Islam, politely explain
that you only answer Islamic questions.

Answer ONLY in ${selectedLanguage}.

Use the Quran and authentic Sunnah.
Provide Quran references when quoting verses.
Give Hadith sources and grades when reliably known.
Never invent religious evidence or references.
Explain recognized Sunni scholarly differences fairly.
Do not claim to be a human scholar.

Answer directly and clearly.
Avoid repetitive sentences and unnecessary lists.
Your name is Jemal Muslim AI.
`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: message.trim() }
      ],
      max_tokens: 1600,
      temperature: 0.4
    });

    const answer = completion.choices?.[0]?.message?.content;

    if (!answer || !answer.trim()) {
      throw new Error("OpenAI returned an empty answer.");
    }

    const cleanAnswer = answer.trim();

    const current = (await userRef.get()).val() || {};

    return res.status(200).json({
      reply: cleanAnswer,
      freeUsed: Number(current.freeUsed) || 0,
      paidCredits: Number(current.paidCredits) || 0
    });

  } catch (error) {
    console.error("AI error:", error);

    if (db && uid && creditType) {
      try {
        await refundCredit(db, uid, creditType);
      } catch (refundError) {
        console.error("Refund error:", refundError);
      }
    }

    return res.status(500).json({
      error: error.message || "AI request failed."
    });
  }
}
