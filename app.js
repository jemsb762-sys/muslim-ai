
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

/* FIREBASE CONFIG */

const firebaseConfig = {
  apiKey: "AIzaSyBTxC0__ORhwZ1MNXjdZ7Sy95JmXRQKU0",
  authDomain: "jemal-muslim-ai-payments.firebaseapp.com",
  databaseURL: "https://jemal-muslim-ai-payments-default-rtdb.firebaseio.com",
  projectId: "jemal-muslim-ai-payments",
  storageBucket: "jemal-muslim-ai-payments.firebasestorage.app",
  messagingSenderId: "862971692178",
  appId: "1:862971692178:web:41d57f73072934005c124b",
  measurementId: "G-XMD1HSX2QF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* HTML ELEMENTS */

const messages = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const sendText = document.getElementById("sendText");
const welcomeText = document.getElementById("welcomeText");
const status = document.getElementById("status");
const themeBtn = document.getElementById("themeBtn");
const langButtons = document.querySelectorAll(".lang-btn");

/* CHECK HTML */

if (
  !messages || !userInput || !sendBtn ||
  !sendText || !welcomeText || !status || !themeBtn
) {
  throw new Error("Required HTML elements are missing. Check index.html IDs.");
}

/* STATE */

let currentLanguage = "am";
let currentUser = null;
let authReady = false;
let sending = false;
let loginInProgress = false;
let paymentButton = null;

/* LANGUAGES */

const languages = {
  am: {
    placeholder: "ጥያቄዎን ይጻፉ...",
    send: "ላክ",
    loading: "⏳ እያሰብኩ ነው...",
    error: "⚠️ ይቅርታ፣ AI መልስ ማግኘት አልተቻለም።",
    welcome: "አስላሙ አለይኩም! 👋\n\nእኔ Jemal Muslim AI ነኝ።\n\nየእስልምና ጥያቄዎን በአማርኛ፣ Afaan Oromoo፣ العربية ወይም English መጠየቅ ይችላሉ።"
  },
  om: {
    placeholder: "Gaaffii kee barreessi...",
    send: "Ergi",
    loading: "⏳ Deebii qopheessaa jira...",
    error: "⚠️ Dhiifama, deebii AI argachuu hin dandeenye.",
    welcome: "Assalaamu Alaaykum! 👋\n\nAni Jemal Muslim AI dha.\n\nGaaffii Islaamaa kee Afaan Oromoo, Amaariffaa, Arabiffaa ykn English'n na gaafadhu."
  },
  ar: {
    placeholder: "اكتب سؤالك...",
    send: "إرسال",
    loading: "⏳ جارٍ التفكير...",
    error: "⚠️ عذراً، لم أستطع الحصول على إجابة.",
    welcome: "السلام عليكم! 👋\n\nأنا Jemal Muslim AI.\n\nيمكنك أن تسألني عن الإسلام باللغة العربية أو الأمهرية أو الأورومية أو الإنجليزية."
  },
  en: {
    placeholder: "Type your question...",
    send: "Send",
    loading: "⏳ Thinking...",
    error: "⚠️ Sorry, I could not get an AI response.",
    welcome: "Assalamu Alaikum! 👋\n\nI am Jemal Muslim AI.\n\nYou can ask Islamic questions in English, Amharic, Afaan Oromoo, or Arabic."
  }
};

/* ADD MESSAGE */

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
  const labels = {
    am: "💳 20 ብር ክፈል - 10 ጥያቄ አግኝ",
    om: "💳 20 Birr kaffali - Gaaffii 10 argadhu",
    ar: "💳 ادفع 20 برًا واحصل على 10 أسئلة",
    en: "💳 Pay 20 ETB - Get 10 Questions"
  };

  return labels[currentLanguage];
}

function showPaymentButton() {
  if (paymentButton?.isConnected) return;

  paymentButton = document.createElement("button");
  paymentButton.type = "button";
  paymentButton.textContent = paymentButtonText();

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
  `;

  paymentButton.addEventListener("click", createPayment);
  messages.appendChild(paymentButton);
  messages.scrollTop = messages.scrollHeight;
}

/* CREATE PAYMENT */

async function createPayment() {
  if (!currentUser || !authReady) {
    status.textContent = "Please wait for Firebase login.";
    return;
  }

  if (!paymentButton || paymentButton.disabled) return;

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
      throw new Error(data.error || "Payment order failed.");
    }

    if (!data.paymentUrl) {
      throw new Error("Payment URL was not returned.");
    }

    const checkoutUrl = new URL(data.paymentUrl);

    if (checkoutUrl.protocol !== "https:") {
      throw new Error("Invalid payment URL.");
    }

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
  if (loginInProgress || auth.currentUser) return;

  loginInProgress = true;
  authReady = false;
  sendBtn.disabled = true;
  status.textContent = "⏳ Connecting to Firebase...";

  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    authReady = true;
    sendBtn.disabled = sending;
    status.textContent = "✅ Firebase connected";
  } catch (error) {
    console.error("Firebase login error:", error);
    currentUser = null;
    authReady = false;
    sendBtn.disabled = true;
    status.textContent = "Firebase login failed: " + error.message;
  } finally {
    loginInProgress = false;
  }
}

/* AUTH STATE */

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
    initializeUser();
  }
});

/* LANGUAGE SWITCH */

function changeLanguage(language) {
  if (!languages[language]) return;

  currentLanguage = language;

  document.body.classList.toggle("lang-om", language === "om");
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

  const data = languages[language];

  userInput.placeholder = data.placeholder;
  sendText.textContent = data.send;
  welcomeText.textContent = data.welcome;

  if (paymentButton?.isConnected) {
    paymentButton.textContent = paymentButtonText();
  }
}

langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    langButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    changeLanguage(button.dataset.lang);
  });
});

/* THEME */

function setTheme(theme) {
  const light = theme === "light";

  document.body.classList.toggle("light", light);
  themeBtn.textContent = light ? "🌙" : "☀️";

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

/* SEND MESSAGE */

async function sendMessage() {
  const question = userInput.value.trim();

  if (!question || sending) return;

  if (!authReady || !currentUser) {
    status.textContent = "Please wait. Firebase is connecting...";
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
        data.message || "የነፃ 5 ጥያቄዎችዎ አልቀዋል። 20 ብር በመክፈል 10 ተጨማሪ ጥያቄዎችን ያግኙ።",
        "bot"
      );

      showPaymentButton();
      status.textContent = "Payment required.";
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
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
      status.textContent = "✅ 5 free questions used. Payment required for 10 more.";
    } else {
      status.textContent =
        "Free used: " + freeUsed +
        " / 5 | Paid questions left: " + paidCredits;
    }

  } catch (error) {
    console.error("Jemal Muslim AI error:", error);
    loading.remove();

    addMessage(
      languages[currentLanguage].error + "\n" + error.message,
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

/* INITIAL LANGUAGE */

changeLanguage("am");

console.log("Jemal Muslim AI app.js loaded successfully.");
