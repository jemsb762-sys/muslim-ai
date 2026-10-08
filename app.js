/* =========================================
   MUSLIM AI
   APP.JS
========================================= */

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const themeBtn = document.getElementById("themeBtn");

const langButtons = document.querySelectorAll(".lang-btn");

let currentLanguage = "am";


/* =========================================
   LANGUAGE
========================================= */

const languageData = {

  am: {
    placeholder: "ጥያቄዎን ይጻፉ...",
    send: "ላክ",
    subtitle:
      "እስላማዊ AI በአማርኛ፣ አፋን ኦሮሞ እና ዐረብኛ"
  },

  om: {
    placeholder: "Gaaffii kee barreessi...",
    send: "Ergi",
    subtitle:
      "Islamic AI Afaan Oromoo, Amaariffaa fi Arabiffaan"
  },

  ar: {
    placeholder: "اكتب سؤالك...",
    send: "إرسال",
    subtitle:
      "مساعد إسلامي باللغات العربية والأمهرية والأورومية"
  }

};


/* =========================================
   CHANGE LANGUAGE
========================================= */

langButtons.forEach(button => {

  button.addEventListener("click", () => {

    langButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    currentLanguage = button.dataset.lang;

    const data = languageData[currentLanguage];

    userInput.placeholder = data.placeholder;

    sendBtn.querySelector("span").textContent = data.send;

    document.getElementById("subtitle").textContent =
      data.subtitle;

  });

});


/* =========================================
   DARK / LIGHT MODE
========================================= */

function setTheme(theme) {

  if (theme === "light") {

    document.body.classList.add("light");

    themeBtn.textContent = "🌙";

    themeBtn.setAttribute(
      "aria-label",
      "Switch to dark mode"
    );

    localStorage.setItem(
      "muslimAITheme",
      "light"
    );

  } else {

    document.body.classList.remove("light");

    themeBtn.textContent = "☀️";

    themeBtn.setAttribute(
      "aria-label",
      "Switch to light mode"
    );

    localStorage.setItem(
      "muslimAITheme",
      "dark"
    );
  }
}


themeBtn.addEventListener("click", () => {

  const isLight =
    document.body.classList.contains("light");

  setTheme(
    isLight
      ? "dark"
      : "light"
  );

});


/* Load saved theme */

const savedTheme =
  localStorage.getItem("muslimAITheme");

if (savedTheme) {

  setTheme(savedTheme);

} else {

  setTheme("dark");

}


/* =========================================
   ADD MESSAGE
========================================= */

function addMessage(text, type) {

  const message = document.createElement("div");

  message.className =
    `message ${type}`;

  message.textContent = text;

  messages.appendChild(message);

  messages.scrollTop =
    messages.scrollHeight;

  return message;
}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

  const text =
    userInput.value.trim();

  if (!text) {
    return;
  }


  /* Show user message */

  addMessage(
    text,
    "user"
  );

  userInput.value = "";

  sendBtn.disabled = true;


  /* Loading message */

  const loading =
    addMessage(
      "⏳ ...",
      "bot"
    );


  try {

    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message: text,

            language:
              currentLanguage

          })
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server error: ${response.status}`
      );

    }


    const data =
      await response.json();


    loading.remove();


    /*
      Different API response formats
      are supported.
    */

    const answer =
      data.reply ||
      data.response ||
      data.message ||
      data.answer;


    if (answer) {

      addMessage(
        answer,
        "bot"
      );

    } else {

      addMessage(
        "ይቅርታ፣ መልስ ማግኘት አልተቻለም።",
        "bot"
      );

    }


  } catch (error) {

    console.error(
      "Muslim AI Error:",
      error
    );


    loading.remove();


    addMessage(
      "⚠️ ይቅርታ፣ አሁን መልስ ማግኘት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
      "bot"
    );

  }


  sendBtn.disabled = false;

  userInput.focus();

}


/* =========================================
   SEND BUTTON
========================================= */

sendBtn.addEventListener(
  "click",
  sendMessage
);


/* =========================================
   ENTER KEY
========================================= */

userInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


/* =========================================
   INITIAL FOCUS
========================================= */

userInput.focus();
