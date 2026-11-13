/* =========================================
   JEMAL MUSLIM AI
   FIREBASE + AI CHAT + PAYO PAYMENT
========================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

/* =========================================
   API SETTINGS
   ከታች ያለውን ዶሜይን በ Vercel ዶሜይንህ ተካ።
   Example: https://jemal-muslim-ai.vercel.app
   (መጨረሻ ላይ "/" አታድርግ)
========================================= */

const VERCEL_URL = "https://YOUR-PROJECT.vercel.app";

// ዶሜይኑን እስክትተካ ድረስ በአንጻራዊ መንገድ ይጠራል
const API_BASE = VERCEL_URL.includes("YOUR-PROJECT")
  ? ""
  : VERCEL_URL.replace(/\/+$/, "");

/* SAFE JSON READER
   መልሱ JSON ካልሆነ እውነተኛውን መልስ ያሳያል */

async function readJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server ${response.status}: ` +
      text.replace(/\s+/g, " ").slice(0, 150)
    );
  }
}

/* FIREBASE CONFIG */

const firebaseConfig = {
  apiKey: "AIzaSyBTxC0__ORhwZ1MNXjdZ7Sy95JmXRQKUO0",
  authDomain: "jemal-muslim-ai-payments.firebaseapp.com",
  databaseURL:
    "https://jemal-muslim-ai-payments-default-rtdb.firebaseio.com",
  projectId: "jemal-muslim-ai-payments",
  storageBucket:
    "jemal-muslim-ai-payments.firebasestorage.app",
  messagingSenderId: "862971692178",
  appId: "1:862971692178:web:41d57f73072934005c124b",
  measurementId: "G-XMD1HSX2QF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ELEMENTS */

const messages = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const sendText = document.getElementById("sendText");
const welcomeText = document.getElementById("welcomeText");
const status = document.getElementById("status");
const themeBtn = document.getElementById("themeBtn");
const langButtons = document.querySelectorAll(".lang-btn");

/* STATE */

let currentLanguage = "am";
let currentUser = null;
let authReady = false;
let sending = false;
let paymentButton = null;
let loginInProgress = false;

/* LANGUAGE TEXT */

const languages = {
  am: {
    placeholder: "ጥያቄዎን ይጻፉ...",
    send: "ላክ",
    loading: "⏳ እያሰብኩ ነው...",
    error: "⚠️ ይቅርታ፣ AI መልስ ማግኘት አልተቻለም።",
    welcome:
      "አስላሙ አለይኩም! 👋\n\nእኔ Jemal Muslim AI ነኝ።\n\nየእስልምና ጥያቄዎን በአማርኛ፣ Afaan Oromoo፣ العربية ወይም English መጠየቅ ይችላሉ።"
  },
  om: {
    placeholder: "Gaaffii kee barreessi...",
    send: "Ergi",
    loading: "⏳ Deebii qopheessaa jira...",
    error: "⚠️ Dhiifama, deebii AI argachuu hin dandeenye.",
    welcome:
      "Assalaamu Alaaykum! 👋\n\nAni Jemal Muslim AI dha.\n\nGaaffii Islaamaa kee Afaan Oromoo, Amaariffaa, Arabiffaa ykn English'n na gaafachuu dandeessa."
  },
  ar: {
    placeholder: "اكتب سؤالك...",
    send: "إرسال",
    loading: "⏳ جارٍ التفكير...",
    error: "⚠️ عذراً، لم أستطع الحصول على إجابة.",
    welcome:
      "السلام عليكم! 👋\n\nأنا Jemal Muslim AI.\n\nيمكنك أن تسألني عن الإسلام باللغة العربية أو الأمهرية أو الأورومية أو الإنجليزية."
  },
  en: {
    placeholder: "Type your question...",
    send: "Send",
    loading: "⏳ Thinking...",
    error: "⚠️ Sorry, I could not get an AI response.",
    welcome:
      "Assalamu Alaikum! 👋\n\nI am Jemal Muslim AI.\n\nYou can ask me Islamic questions in English, Amharic, Afaan Oromoo, or Arabic."
  }
};

/* DISPLAY MESSAGE */

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  return div;
}

/* PAYMENT BUTTON */

function paymentButtonText() {
  if (currentLanguage === "om") {
    return "💳 20 Birr kaffali - Gaaffii 10 argadhu";
  }

  if (currentLanguage === "ar") {
    return "💳 ادفع 20 برًا واحصل على 10 أسئلة";
  }

  if (currentLanguage === "en") {
    return "💳 Pay 20 ETB - Get 10 Questions";
  }

  return "💳 20 ብር ክፈል - 10 ጥያቄ አግኝ";
}

function showPaymentButton() {
  if (paymentButton && paymentButton.isConnected) {
    return;
  }

  paymentButton = document.createElement("button");
  paymentButton.type = "button";
  paymentButton.textContent = paymentButtonText();

  paymentButton.style.cssText = `
    display: block;
    width: 100%;
    max-width: 360px;
    margin: 14px auto;
    padding: 16px 12px;
    border: 0;
    border-radius: 12px;
    background: #d4af37;
    color: #10251c;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  `;

  paymentButton.addEventListener("click", createPayment);

  messages.appendChild(paymentButton);
  messages.scrollTop = messages.scrollHeight;
}

function updatePaymentButtonLanguage() {
  if (paymentButton && paymentButton.isConnected) {
    paymentButton.textContent = paymentButtonText();
  }
}

/* CREATE PAYO PAYMENT */

async function createPayment() {
  if (!currentUser || !authReady) {
    status.textContent = "Please wait for login.";
    return;
  }

  if (!paymentButton || paymentButton.disabled) {
    return;
  }

  paymentButton.disabled = true;
  paymentButton.textContent = "⏳ Opening payment...";

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch(
      API_BASE + "/api/payment/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.error || "Payment order could not be created."
      );
    }

    if (
      typeof data.paymentUrl !== "string" ||
      !data.paymentUrl.trim()
    ) {
      throw new Error(
        "Payo did not return a valid payment URL."
      );
    }

    let checkoutUrl;

    try {
      checkoutUrl = new URL(data.paymentUrl.trim());
    } catch {
      throw new Error("Payo returned an invalid payment URL.");
    }

    if (checkoutUrl.protocol !== "https:") {
      throw new Error("Payment link must use HTTPS.");
    }

    status.textContent = "Opening Payo checkout...";
    window.location.href = checkoutUrl.href;

  } catch (error) {
    console.error("Payment error:", error);

    paymentButton.disabled = false;
    paymentButton.textContent = paymentButtonText();

    status.textContent = error.message;
  }
}

/* FIREBASE LOGIN */

async function initializeUser() {
  if (loginInProgress || auth.currentUser) {
    return;
  }

  loginInProgress = true;
  authReady = false;
  sendBtn.disabled = true;
  status.textContent = "⏳ Connecting to Firebase...";

  try {
    const result = await signInAnonymously(auth);

    currentUser = result.user;
    authReady = true;

    sendBtn.disabled = false;
    status.textContent = "✅ Firebase connected";

  } catch (error) {
    console.error("Firebase login error:", error);

    currentUser = null;
    authReady = false;
    sendBtn.disabled = true;

    status.textContent =
      "Firebase login failed: " + error.message;

  } finally {
    loginInProgress = false;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authReady = true;
    sendBtn.disabled = sending;
    status.textContent = "✅ Firebase connected";
  } else {
    currentUser = null;
    authReady = false;
    sendBtn.disabled = true;

    if (!loginInProgress) {
      initializeUser();
    }
  }
});

/* LANGUAGE SWITCH */

function changeLanguage(language) {
  if (!languages[language]) return;

  currentLanguage = language;

  document.body.classList.toggle(
    "lang-om",
    language === "om"
  );

  document.documentElement.lang =
    language === "om" ? "om" : language;

  document.documentElement.dir =
    language === "ar" ? "rtl" : "ltr";

  const data = languages[language];

  userInput.placeholder = data.placeholder;
  sendText.textContent = data.send;
  welcomeText.textContent = data.welcome;

  updatePaymentButtonLanguage();
}

langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    langButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    changeLanguage(button.dataset.lang);
  });
});

/* DARK / LIGHT MODE */

function setTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "🌙";
  } else {
    document.body.classList.remove("light");
    themeBtn.textContent = "☀️";
  }

  try {
    localStorage.setItem("jemalTheme", theme);
  } catch (error) {
    console.warn("Theme storage unavailable.");
  }
}

themeBtn.addEventListener("click", () => {
  const light = document.body.classList.contains("light");

  setTheme(light ? "dark" : "light");
});

let savedTheme = "dark";

try {
  savedTheme = localStorage.getItem("jemalTheme") || "dark";
} catch (error) {
  console.warn("Theme storage unavailable.");
}

setTheme(savedTheme);

/* SEND MESSAGE TO AI */

async function sendMessage() {
  const question = userInput.value.trim();

  if (!question || sending) return;

  if (!authReady || !currentUser) {
    status.textContent =
      "Please wait. Firebase is connecting...";
    return;
  }

  sending = true;
  sendBtn.disabled = true;

  addMessage(question, "user");

  userInput.value = "";
  userInput.style.height = "auto";

  const loading = addMessage(
    languages[currentLanguage].loading,
    "bot"
  );

  status.textContent = "";

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        message: question,
        language: currentLanguage
      })
    });

    const data = await readJson(response);

    loading.remove();

    if (response.status === 402) {
      addMessage(
        data.message ||
        "የነፃ 5 ጥያቄዎችዎ አልቀዋል። 20 ብር በመክፈል 10 ተጨማሪ ጥያቄዎችን ያግኙ።",
        "bot"
      );

      showPaymentButton();
      status.textContent = "Payment required.";
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error || `Server error: ${response.status}`
      );
    }

    const answer =
      data.reply ||
      data.output ||
      data.response ||
      data.answer;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("The AI returned an empty answer.");
    }

    addMessage(answer.trim(), "bot");

    const freeUsed = Number(data.freeUsed) || 0;
    const paidCredits = Number(data.paidCredits) || 0;

    if (freeUsed >= 5 && paidCredits <= 0) {
      showPaymentButton();

      status.textContent =
        "✅ 5 free questions used. Payment required for 10 more.";
    } else {
      status.textContent =
        "Free used: " + freeUsed +
        " / 5 | Paid questions left: " +
        paidCredits;
    }

  } catch (error) {
    console.error("Jemal Muslim AI error:", error);

    loading.remove();

    addMessage(
      languages[currentLanguage].error +
      "\n" + error.message,
      "bot"
    );

    status.textContent = "API connection error.";

  } finally {
    sending = false;
    sendBtn.disabled = !authReady;
  }
}

/* BUTTON EVENTS */

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* TEXTAREA AUTO RESIZE */

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";

  userInput.style.height =
    Math.min(userInput.scrollHeight, 140) + "px";
});
