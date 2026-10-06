const API_URL = "/api/chat";


const translations = {

  am: {

    subtitle:
      "እስላማዊ AI በአማርኛ፣ አፋን ኦሮሞ እና ዐረብኛ",

    welcome:
      "አስላሙ አለይኩም! እኔ Muslim AI ነኝ።\nየእስልምና ጥያቄዎን ይጠይቁኝ።",

    placeholder:
      "ጥያቄዎን ይጻፉ...",

    send:
      "ላክ",

    typing:
      "መልስ እያዘጋጀ ነው...",

    network:
      "የኔትወርክ ችግር አለ። እባክዎ እንደገና ይሞክሩ።",

    error:
      "መልስ ማግኘት አልተቻለም።",

    empty:
      "እባክዎ ጥያቄ ያስገቡ።"
  },


  om: {

    subtitle:
      "AI Islaamaa Afaan Oromoo, Amaariffaa fi Arabiffaan",

    welcome:
      "Assalaamu Alaikum! Ani Muslim AI dha.\nGaaffii Islaamaa kee na gaafadhu.",

    placeholder:
      "Gaaffii kee barreessi...",

    send:
      "Ergi",

    typing:
      "Deebii qopheessaa jira...",

    network:
      "Rakkoon network jira. Maaloo irra deebi'ii yaali.",

    error:
      "Deebii argachuun hin danda'amne.",

    empty:
      "Maaloo gaaffii kee galchi."
  },


  ar: {

    subtitle:
      "ذكاء اصطناعي إسلامي بالعربية والأمهرية والأورومو",

    welcome:
      "السلام عليكم! أنا Muslim AI.\nاسألني عن الإسلام.",

    placeholder:
      "اكتب سؤالك...",

    send:
      "إرسال",

    typing:
      "جارٍ إعداد الإجابة...",

    network:
      "حدثت مشكلة في الاتصال. يرجى المحاولة مرة أخرى.",

    error:
      "تعذر الحصول على إجابة.",

    empty:
      "يرجى كتابة سؤالك."
  }

};


let currentLang = "am";


/* LANGUAGE */

function changeLanguage(lang) {

  currentLang = lang;

  const t = translations[lang];

  document
    .querySelectorAll(".lang-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.lang === lang
      );

    });


  document
    .getElementById("subtitle")
    .textContent = t.subtitle;


  document
    .getElementById("welcome")
    .textContent = t.welcome;


  document
    .getElementById("userInput")
    .placeholder = t.placeholder;


  document
    .getElementById("sendBtn")
    .textContent = t.send;


  document.documentElement.lang =
    lang === "om" ? "om" : lang;

  document.documentElement.dir =
    lang === "ar" ? "rtl" : "ltr";
}


/* ADD MESSAGE */

function addMessage(text, type) {

  const messages =
    document.getElementById("messages");

  const message =
    document.createElement("div");

  message.className =
    `message ${type}`;

  message.textContent =
    text;

  messages.appendChild(message);

  messages.scrollTop =
    messages.scrollHeight;

  return message;
}


/* SEND MESSAGE */

async function sendMessage() {

  const input =
    document.getElementById("userInput");

  const sendButton =
    document.getElementById("sendBtn");

  const text =
    input.value.trim();

  const t =
    translations[currentLang];


  if (!text) {

    input.placeholder =
      t.empty;

    return;
  }


  /* USER MESSAGE */

  addMessage(
    text,
    "user"
  );


  input.value = "";

  sendButton.disabled = true;


  /* TYPING */

  const typing =
    addMessage(
      t.typing,
      "bot typing"
    );


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message: text,

            language: currentLang

          })
        }
      );


    let data;

    try {

      data =
        await response.json();

    } catch {

      data = {};

    }


    typing.remove();


    if (!response.ok) {

      addMessage(
        data.error || t.error,
        "bot"
      );

    } else {

      addMessage(
        data.reply || t.error,
        "bot"
      );

    }


  } catch (error) {

    console.error(
      "Muslim AI error:",
      error
    );


    typing.remove();


    addMessage(
      t.network,
      "bot"
    );

  }


  sendButton.disabled =
    false;

  input.focus();

}


/* BUTTON */

document
  .getElementById("sendBtn")
  .addEventListener(
    "click",
    sendMessage
  );


/* ENTER */

document
  .getElementById("userInput")
  .addEventListener(
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


/* LANGUAGE BUTTONS */

document
  .querySelectorAll(".lang-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        changeLanguage(
          button.dataset.lang
        );

      }
    );

  });


/* INITIAL LANGUAGE */

changeLanguage("am");