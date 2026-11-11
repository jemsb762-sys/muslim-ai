
/* =========================================
   JEMAL MUSLIM AI
   Firebase + AI Chat + PAYO PAYMENT
========================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTxC0__ORhwZ1MNXjdZ7Sy95JmXRQKUO0",
  authDomain: "jemal-muslim-ai-payments.firebaseapp.com",
  databaseURL:
    "https://jemal-muslim-ai-payments-default-rtdb.firebaseio.com",
  projectId: "jemal-muslim-ai-payments",
  storageBucket:
    "jemal-muslim-ai-payments.firebasestorage.app",
  messagingSenderId: "862971692178",
  appId: "1:862971692178:web:41d57f73072934005c124b"
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

let currentLanguage = "am";
let currentUser = null;
let authReady = false;
let sending = false;
let paymentButton = null;

/* LANGUAGES */

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

/* MESSAGE DISPLAY */

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

/* PAYMENT BUTTON */

function showPaymentButton() {
  if (paymentButton) return;

  paymentButton = document.createElement("button");
  paymentButton.type = "button";
  paymentButton.textContent =
    currentLanguage === "om"
      ? "20 Birr kaffali - Gaaffii 10 argadhu"
      : currentLanguage === "ar"
      ? "ادفع 20 برًا واحصل على 10 أسئلة"
      : currentLanguage === "en"
      ? "Pay 20 ETB - Get 10 Questions"
      : "💳 20 ብር ክፈል - 10 ጥያቄ አግኝ";

  paymentButton.style.cssText = `
    display:block;
    width:100%;
    max-width:360px;
    margin:14px auto;
    padding:16px 12px;
    border:0;
    border-radius:12px;
    background:#d4af37;
    color:#10251c;
    font-size:16px;
    font-weight:700;
    cursor:pointer;
  `;

  paymentButton.addEventListener("click", createPayment);

  messages.appendChild(paymentButton);
  messages.scrollTop = messages.scrollHeight;
}

/* CREATE PAYO PAYMENT */

async function createPayment() {
  if (!currentUser || !authReady) {
    status.textContent = "Please wait for login.";
    return;
  }

  paymentButton.disabled = true;
  paymentButton.textContent = "⏳ Opening payment...";

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch("/api/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Payment order could not be created."
      );
    }

    if (!data.paymentUrl) {
      throw new Error("Payment link is missing.");
    }

    status.textContent = "Opening Payo checkout...";

    window.location.assign(data.paymentUrl);

  } catch (error) {
    console.error("Payment error:", error);

    paymentButton.disabled = false;
    paymentButton.textContent =
      "💳 20 ብር ክፈል - 10 ጥያቄ አግኝ";

    status.textContent = error.message;
  }
}

/* FIREBASE LOGIN */

async function initializeUser() {
  sendBtn.disabled = true;
  status.textContent = "⏳ Connecting to Firebase...";

  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Firebase user was not created.");
    }

    authReady = true;
    sendBtn.disabled = false;
    status.textContent = "✅ Firebase connected";

  } catch (error) {
    console.error("Firebase authentication error:", error);
    authReady = false;
    sendBtn.disabled = true;
    status.textContent = "Firebase login failed: " + error.message;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authReady = true;
    sendBtn.disabled = false;
    status.textContent = "✅ Firebase connected";
  } else {
    currentUser = null;
    authReady = false;
    sendBtn.disabled = true;
    await initializeUser();
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

    const response = await fetch("/api/chat", {
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

    const data = await response.json();

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

    if (paymentButton) {
      paymentButton.remove();
      paymentButton = null;
    }

    addMessage(answer.trim(), "bot");

    status.textContent =
      "Free used: " + (data.freeUsed ?? 0) +
      " / 5 | Paid questions left: " +
      (data.paidCredits ?? 0);

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
