
/* =========================================
   JEMAL MUSLIM AI + FIREBASE AUTH
========================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously
} from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

/* FIREBASE CONFIG */

const firebaseConfig = {
  apiKey: "AIzaSyBTxC0__ORhwZ1MNXjdZ7Sy95JmXRQKUO0",
  authDomain: "jemal-muslim-ai-payments.firebaseapp.com",
  databaseURL: "https://jemal-muslim-ai-payments-default-rtdb.firebaseio.com",
  projectId: "jemal-muslim-ai-payments",
  storageBucket: "jemal-muslim-ai-payments.firebasestorage.app",
  messagingSenderId: "862971692178",
  appId: "1:862971692178:web:41d57f73072934005c124b"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

/* =========================================
   ELEMENTS
========================================= */

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

/* =========================================
   LANGUAGES
========================================= */

const languages = {
  am: {
    placeholder: "ጥያቄዎን ይጻፉ...",
    send: "ላክ",
    welcome: "አስላሙ አለይኩም! 👋\n\nእኔ Jemal Muslim AI ነኝ።\n\nየእስልምና ጥያቄዎን በአማርኛ፣ Afaan Oromoo፣ العربية ወይም English መጠየቅ ይችላሉ።",
    loading: "⏳ እያሰብኩ ነው...",
    error: "⚠️ ይቅርታ፣ AI መልስ ማግኘት አልተቻለም።"
  },

  om: {
    placeholder: "Gaaffii kee barreessi...",
    send: "Ergi",
    welcome: "Assalaamu Alaaykum! 👋\n\nAni Jemal Muslim AI dha.\n\nGaaffii Islaamaa kee Afaan Oromoo, Amaariffaa, Arabiffaa ykn English'n na gaafachuu dandeessa.",
    loading: "⏳ Deebii qopheessaa jira...",
    error: "⚠️ Dhiifama, deebii AI argachuu hin dandeenye."
  },

  ar: {
    placeholder: "اكتب سؤالك...",
    send: "إرسال",
    welcome: "السلام عليكم! 👋\n\nأنا Jemal Muslim AI.\n\nيمكنك أن تسألني عن الإسلام باللغة العربية أو الأمهرية أو الأورومية أو الإنجليزية.",
    loading: "⏳ جارٍ التفكير...",
    error: "⚠️ عذراً، لم أستطع الحصول على إجابة."
  },

  en: {
    placeholder: "Type your question...",
    send: "Send",
    welcome: "Assalamu Alaikum! 👋\n\nI am Jemal Muslim AI.\n\nYou can ask me Islamic questions in English, Amharic, Afaan Oromoo, or Arabic.",
    loading: "⏳ Thinking...",
    error: "⚠️ Sorry, I could not get an AI response."
  }
};

/* =========================================
   FIREBASE ANONYMOUS LOGIN
========================================= */

async function initializeUser() {
  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    authReady = true;
    status.textContent = "✅ Firebase connected";
    sendBtn.disabled = false;
  } catch (error) {
    console.error("Firebase login error:", error);
    status.textContent =
      "Firebase login failed: " + error.message;
    sendBtn.disabled = true;
  }
}

sendBtn.disabled = true;
status.textContent = "⏳ Connecting to Firebase...";

initializeUser();

/* =========================================
   LANGUAGE
========================================= */

function changeLanguage(language) {
  currentLanguage = language;

  const data = languages[language];

  userInput.placeholder = data.placeholder;
  sendText.textContent = data.send;
  welcomeText.textContent = data.welcome;
}

langButtons.forEach(button => {
  button.addEventListener("click", () => {
    langButtons.forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");
    changeLanguage(button.dataset.lang);
  });
});

/* =========================================
   THEME
========================================= */

function setTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "🌙";
    localStorage.setItem("jemalTheme", "light");
  } else {
    document.body.classList.remove("light");
    themeBtn.textContent = "☀️";
    localStorage.setItem("jemalTheme", "dark");
  }
}

themeBtn.addEventListener("click", () => {
  const isLight =
    document.body.classList.contains("light");

  setTheme(isLight ? "dark" : "light");
});

setTheme(localStorage.getItem("jemalTheme") || "dark");

/* =========================================
   ADD MESSAGE
========================================= */

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  return div;
}

/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {
  const text = userInput.value.trim();

  if (!text || sending) return;

  if (!authReady || !currentUser) {
    status.textContent = "Please wait for Firebase login.";
    return;
  }

  sending = true;
  sendBtn.disabled = true;

  addMessage(text, "user");
  userInput.value = "";
  userInput.style.height = "auto";

  const loading = addMessage(
    languages[currentLanguage].loading,
    "bot"
  );

  status.textContent = "";

  try {
    const idToken = await currentUser.getIdToken(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + idToken
      },
      body: JSON.stringify({
        message: text,
        language: currentLanguage
      })
    });

    const data = await response.json();

    loading.remove();

    if (response.status === 402) {
      addMessage(
        "የነፃ 5 ጥያቄዎችዎ አልቀዋል። 20 ብር በመክፈል 10 ተጨማሪ ጥያቄዎችን ማግኘት ይችላሉ።",
        "bot"
      );

      status.textContent =
        "Payment required. Your question was not answered.";

      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "HTTP " + response.status);
    }

    const answer =
      data.reply ||
      data.output ||
      data.response ||
      data.answer;

    if (!answer) {
      throw new Error("Empty AI response.");
    }

    addMessage(answer, "bot");

    status.textContent =
      "Free used: " + (data.freeUsed ?? 0) +
      " / 5 | Paid questions left: " +
      (data.paidCredits ?? 0);

  } catch (error) {
    console.error("Jemal Muslim AI:", error);

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
    userInput.focus();
  }
}

/* =========================================
   BUTTON AND ENTER
========================================= */

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* =========================================
   AUTO RESIZE
========================================= */

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";

  userInput.style.height =
    Math.min(userInput.scrollHeight, 140) + "px";
});
