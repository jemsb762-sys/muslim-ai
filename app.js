/* =========================================
   JEMAL MUSLIM AI
========================================= */

const messages =
  document.getElementById("messages");

const userInput =
  document.getElementById("userInput");

const sendBtn =
  document.getElementById("sendBtn");

const sendText =
  document.getElementById("sendText");

const welcomeText =
  document.getElementById("welcomeText");

const status =
  document.getElementById("status");

const themeBtn =
  document.getElementById("themeBtn");

const langButtons =
  document.querySelectorAll(".lang-btn");


let currentLanguage = "am";


/* =========================================
   LANGUAGE DATA
========================================= */

const languages = {

  am: {

    placeholder:
      "ጥያቄዎን ይጻፉ...",

    send:
      "ላክ",

    welcome:
      "አስላሙ አለይኩም! 👋\n\nእኔ Jemal Muslim AI ነኝ።\n\nየእስልምና ጥያቄዎን በአማርኛ፣ Afaan Oromoo፣ العربية ወይም English መጠየቅ ይችላሉ።",

    loading:
      "⏳ እያሰብኩ ነው...",

    error:
      "⚠️ ይቅርታ፣ AI መልስ ማግኘት አልተቻለም። እባክዎ እንደገና ይሞክሩ።"

  },


  om: {

    placeholder:
      "Gaaffii kee barreessi...",

    send:
      "Ergi",

    welcome:
      "Assalaamu Alaaykum! 👋\n\nAni Jemal Muslim AI dha.\n\nGaaffii Islaamaa kee Afaan Oromoo, Amaariffaa, Arabiffaa ykn English'n na gaafachuu dandeessa.",

    loading:
      "⏳ Deebii qopheessaa jira...",

    error:
      "⚠️ Dhiifama, deebii AI argachuu hin dandeenye. Mee irra deebi'ii yaali."

  },


  ar: {

    placeholder:
      "اكتب سؤالك...",

    send:
      "إرسال",

    welcome:
      "السلام عليكم! 👋\n\nأنا Jemal Muslim AI.\n\nيمكنك أن تسألني عن الإسلام باللغة العربية أو الأمهرية أو الأورومية أو الإنجليزية.",

    loading:
      "⏳ جارٍ التفكير...",

    error:
      "⚠️ عذراً، لم أستطع الحصول على إجابة من الذكاء الاصطناعي. حاول مرة أخرى."

  },


  en: {

    placeholder:
      "Type your question...",

    send:
      "Send",

    welcome:
      "Assalamu Alaikum! 👋\n\nI am Jemal Muslim AI.\n\nYou can ask me Islamic questions in English, Amharic, Afaan Oromoo, or Arabic.",

    loading:
      "⏳ Thinking...",

    error:
      "⚠️ Sorry, I could not get an AI response. Please try again."

  }

};


/* =========================================
   CHANGE LANGUAGE
========================================= */

function changeLanguage(language) {

  currentLanguage =
    language;

  const data =
    languages[language];

  userInput.placeholder =
    data.placeholder;

  sendText.textContent =
    data.send;

  welcomeText.textContent =
    data.welcome;

}


langButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      langButtons.forEach(btn => {

        btn.classList.remove(
          "active"
        );

      });

      button.classList.add(
        "active"
      );

      changeLanguage(
        button.dataset.lang
      );

    }
  );

});


/* =========================================
   THEME
========================================= */

function setTheme(theme) {

  if (theme === "light") {

    document.body.classList.add(
      "light"
    );

    themeBtn.textContent =
      "🌙";

    localStorage.setItem(
      "jemalTheme",
      "light"
    );

  } else {

    document.body.classList.remove(
      "light"
    );

    themeBtn.textContent =
      "☀️";

    localStorage.setItem(
      "jemalTheme",
      "dark"
    );

  }

}


themeBtn.addEventListener(
  "click",
  () => {

    const isLight =
      document.body.classList.contains(
        "light"
      );

    setTheme(
      isLight
        ? "dark"
        : "light"
    );

  }
);


const savedTheme =
  localStorage.getItem(
    "jemalTheme"
  );


setTheme(
  savedTheme || "dark"
);


/* =========================================
   ADD MESSAGE
========================================= */

function addMessage(
  text,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    `message ${type}`;

  div.textContent =
    text;

  messages.appendChild(
    div
  );

  messages.scrollTop =
    messages.scrollHeight;

  return div;

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


  /* USER MESSAGE */

  addMessage(
    text,
    "user"
  );


  userInput.value = "";

  sendBtn.disabled =
    true;


  const loading =
    addMessage(
      languages[currentLanguage].loading,
      "bot"
    );


  status.textContent =
    "";


  try {

    const response =
      await fetch(
        "/api/chat",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              message:
                text,

              language:
                currentLanguage

            })

        }
      );


    let data;

    try {

      data =
        await response.json();

    } catch {

      throw new Error(
        "Server did not return JSON"
      );

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        `HTTP ${response.status}`
      );

    }


    loading.remove();


    const answer =
      data.reply ||
      data.output ||
      data.response ||
      data.answer;


    if (!answer) {

      throw new Error(
        "Empty AI response"
      );

    }


    addMessage(
      answer,
      "bot"
    );


  } catch (error) {

    console.error(
      "Jemal Muslim AI:",
      error
    );


    loading.remove();


    addMessage(
      languages[currentLanguage].error,
      "bot"
    );


    status.textContent =
      "API connection error";

  }


  sendBtn.disabled =
    false;

  userInput.focus();

}


/* =========================================
   BUTTON
========================================= */

sendBtn.addEventListener(
  "click",
  sendMessage
);


/* =========================================
   ENTER
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
   AUTO RESIZE
========================================= */

userInput.addEventListener(
  "input",
  () => {

    userInput.style.height =
      "auto";

    userInput.style.height =
      Math.min(
        userInput.scrollHeight,
        140
      ) + "px";

  }
);
