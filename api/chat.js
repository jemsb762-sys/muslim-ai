
import OpenAI from "openai";
import admin from "firebase-admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

async function refundCredit(db, uid, type) {
  await db.ref(`users/${uid}`).transaction((user) => {
    if (!user) return user;

    if (type === "free") {
      user.freeUsed = Math.max(0, (user.freeUsed || 0) - 1);
    } else {
      user.paidCredits = (user.paidCredits || 0) + 1;
    }

    return user;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI key is missing." });
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

    const decoded = await firebase.auth().verifyIdToken(token);
    uid = decoded.uid;

    db = firebase.database();

    const { message, language } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

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
        user.lastQuestionAt = Date.now();
        user.lastCreditType = "free";
        return user;
      }

      if (user.paidCredits > 0) {
        user.paidCredits--;
        user.lastQuestionAt = Date.now();
        user.lastCreditType = "paid";
        return user;
      }

      return;
    });

    if (!reservation.committed) {
      const current = (await userRef.get()).val() || {};

      return res.status(402).json({
        error: "PAYMENT_REQUIRED",
        message: "Your free questions are finished. Please pay 20 birr for 10 more questions.",
        freeUsed: current.freeUsed || 0,
        paidCredits: current.paidCredits || 0
      });
    }

    creditType =
      reservation.snapshot.val().lastCreditType;

    const languageNames = {
      am: "Amharic",
      om: "Afaan Oromoo",
      ar: "Arabic",
      en: "English"
    };

    const selectedLanguage =
      languageNames[language] || "Amharic";

    const instructions = `
You are Jemal Muslim AI, an Islamic educational assistant.

Answer primarily in ${selectedLanguage}.

Use the Quran and authentic Sunnah as primary sources.
Give Quran references when quoting verses.
Give Hadith sources when known.
Never invent Quran verses, Hadith, scholars, or references.
Explain recognized Sunni scholarly differences fairly.
Be respectful and educational.
Never claim to be a human scholar.
Your name is Jemal Muslim AI.
`;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: message.trim(),
      max_output_tokens: 1800
    });

    const answer = response.output_text;

    if (!answer || !answer.trim()) {
      throw new Error("OpenAI returned an empty response.");
    }

    const current = (await userRef.get()).val() || {};

    return res.status(200).json({
      reply: answer.trim(),
      freeUsed: current.freeUsed || 0,
      paidCredits: current.paidCredits || 0
    });

  } catch (error) {
    console.error("Chat API error:", error);

    if (db && uid && creditType) {
      try {
        await refundCredit(db, uid, creditType);
      } catch (refundError) {
        console.error("Credit refund error:", refundError);
      }
    }

    return res.status(500).json({
      error: error?.message || "AI request failed."
    });
  }
}
