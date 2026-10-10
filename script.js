"use strict";

/*
 * GUESS BATTLE
 * Frontend game controller.
 *
 * The live AI and web research will be connected through
 * the backend API in a later step.
 */

const API_URL = "/api/game";

const $ = (id) => document.getElementById(id);

const elements = {
  setupScreen: $("setupScreen"),
  gameScreen: $("gameScreen"),

  categorySelect: $("categorySelect"),
  difficultySelect: $("difficultySelect"),
  languageSelect: $("languageSelect"),

  startButton: $("startButton"),
  exitButton: $("exitButton"),

  roundLabel: $("roundLabel"),
  turnLabel: $("turnLabel"),
  humanScore: $("humanScore"),
  aiScore: $("aiScore"),

  humanSecretStatus: $("humanSecretStatus"),

  redCardButton: $("redCardButton"),
  blueCardButton: $("blueCardButton"),
  redCardStatus: $("redCardStatus"),
  blueCardStatus: $("blueCardStatus"),

  questionCounter: $("questionCounter"),
  chatLog: $("chatLog"),

  questionForm: $("questionForm"),
  questionInput: $("questionInput"),
  askButton: $("askButton"),

  answerChoices: $("answerChoices"),

  guessInput: $("guessInput"),
  guessButton: $("guessButton"),

  gameNotice: $("gameNotice"),
  languageButton: $("languageButton")
};

const state = {
  active: false,
  busy: false,
  round: 1,
  humanScore: 0,
  aiScore: 0,
  redCardUsed: false,
  blueCardUsed: false,
  language: "ar",
  category: "football",
  difficulty: "medium"
};

const messages = {
  ar: {
    waiting: "جارٍ الاتصال بخادم اللعبة...",
    connectionError:
      "خادم اللعبة غير متصل بعد. سننشئه في الخطوة التالية؛ لم يتم إرسال سؤال أو اختلاق إجابة.",
    startError: "تعذّر بدء اللعبة.",
    questionError: "تعذّر إرسال السؤال.",
    answerError: "تعذّر إرسال الإجابة.",
    guessError: "تعذّر إرسال التخمين.",
    cardError: "تعذّر استخدام البطاقة.",
    enterQuestion: "اكتب سؤالًا أولًا.",
    enterGuess: "اكتب اسم الشخصية التي تريد تخمينها.",
    selectAnswer: "اختر نعم أو لا أو غير معروف.",
    humanTurn: "دورك",
    aiTurn: "دور الذكاء الاصطناعي",
    round: "الجولة",
    you: "أنت",
    ai: "الذكاء الاصطناعي",
    question: "سؤال",
    answer: "الإجابة",
    guess: "تخمين",
    system: "النظام",
    yes: "نعم",
    no: "لا",
    unknown: "غير معروف",
    gameOver: "انتهت المباراة.",
    confirmExit: "هل تريد الخروج من المباراة الحالية؟"
  },

  en: {
    waiting: "Connecting to the game server...",
    connectionError:
      "The game server is not connected yet. We will create it next; no question was sent and no answer was fabricated.",
    startError: "Could not start the game.",
    questionError: "Could not send the question.",
    answerError: "Could not send the answer.",
    guessError: "Could not send the guess.",
    cardError: "Could not use the card.",
    enterQuestion: "Enter a question first.",
    enterGuess: "Enter the character you want to guess.",
    selectAnswer: "Choose Yes, No, or Unknown.",
    humanTurn: "Your turn",
    aiTurn: "AI's turn",
    round: "Round",
    you: "You",
    ai: "AI",
    question: "Question",
    answer: "Answer",
    guess: "Guess",
    system: "System",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
    gameOver: "The match is over.",
    confirmExit: "Do you want to leave the current match?"
  }
};

function t(key) {
  return messages[state.language]?.[key] || messages.ar[key] || key;
}

function showNotice(message, type = "info") {
  if (!elements.gameNotice) return;

  elements.gameNotice.textContent = message;
  elements.gameNotice.dataset.type = type;
  elements.gameNotice.hidden = false;
}

function clearNotice() {
  if (!elements.gameNotice) return;

  elements.gameNotice.textContent = "";
  elements.gameNotice.hidden = true;
}

function setBusy(isBusy) {
  state.busy = isBusy;

  const controls = [
    elements.startButton,
    elements.askButton,
    elements.guessButton,
    elements.redCardButton,
    elements.blueCardButton
  ];

  controls.forEach((button) => {
    if (button) button.disabled = isBusy;
  });
}

function addChatMessage(speaker, text, type = "message") {
  if (!elements.chatLog) return;

  const message = document.createElement("div");
  message.className = `chat-message chat-${type}`;

  const title = document.createElement("strong");
  title.className = "chat-speaker";
  title.textContent = speaker;

  const content = document.createElement("p");
  content.className = "chat-text";
  content.textContent = text;

  message.append(title, content);
  elements.chatLog.appendChild(message);

  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function setScreen(screen) {
  if (elements.setupScreen) {
    elements.setupScreen.hidden = screen !== "setup";
  }

  if (elements.gameScreen) {
    elements.gameScreen.hidden = screen !== "game";
  }
}

function updateScoreboard(data = {}) {
  if (typeof data.round === "number") {
    state.round = data.round;
  }

  if (typeof data.humanScore === "number") {
    state.humanScore = data.humanScore;
  }

  if (typeof data.aiScore === "number") {
    state.aiScore = data.aiScore;
  }

  if (elements.roundLabel) {
    elements.roundLabel.textContent = `${t("round")} ${state.round}`;
  }

  if (elements.humanScore) {
    elements.humanScore.textContent = String(state.humanScore);
  }

  if (elements.aiScore) {
    elements.aiScore.textContent = String(state.aiScore);
  }

  if (typeof data.questionCount === "number" && elements.questionCounter) {
    elements.questionCounter.textContent = String(data.questionCount);
  }

  if (typeof data.humanTurn === "boolean" && elements.turnLabel) {
    elements.turnLabel.textContent = data.humanTurn
      ? t("humanTurn")
      : t("aiTurn");
  }

  if (typeof data.redCardUsed === "boolean") {
    state.redCardUsed = data.redCardUsed;
  }

  if (typeof data.blueCardUsed === "boolean") {
    state.blueCardUsed = data.blueCardUsed;
  }

  updateCards();
}

function updateCards() {
  if (elements.redCardButton) {
    elements.redCardButton.disabled =
      state.busy || !state.active || state.redCardUsed;
  }

  if (elements.blueCardButton) {
    elements.blueCardButton.disabled =
      state.busy || !state.active || state.blueCardUsed;
  }

  if (elements.redCardStatus) {
    elements.redCardStatus.textContent = state.redCardUsed
      ? "مستخدمة"
      : "متاحة";
  }

  if (elements.blueCardStatus) {
    elements.blueCardStatus.textContent = state.blueCardUsed
      ? "مستخدمة"
      : "متاحة";
  }
}

function applyServerState(data) {
  if (!data || typeof data !== "object") return;

  if (data.state && typeof data.state === "object") {
    updateScoreboard(data.state);
  } else {
    updateScoreboard(data);
  }

  if (typeof data.message === "string" && data.message.trim()) {
    addChatMessage(t("system"), data.message, "system");
  }

  if (Array.isArray(data.messages)) {
    data.messages.forEach((item) => {
      if (!item || typeof item.text !== "string") return;

      const speaker = typeof item.speaker === "string"
        ? item.speaker
        : t("system");

      const type = typeof item.type === "string"
        ? item.type
        : "message";

      addChatMessage(speaker, item.text, type);
    });
  }

  if (data.humanSecretSet === true && elements.humanSecretStatus) {
    elements.humanSecretStatus.textContent = "تم اختيار الشخصية";
  }

  if (data.gameOver === true) {
    state.active = false;
    updateCards();

    if (elements.questionInput) {
      elements.questionInput.disabled = true;
    }

    if (elements.guessInput) {
      elements.guessInput.disabled = true;
    }

    if (elements.askButton) {
      elements.askButton.disabled = true;
    }

    if (elements.guessButton) {
      elements.guessButton.disabled = true;
    }

    showNotice(t("gameOver"), "success");
  }
}

async function apiRequest(action, extra = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      language: state.language,
      category: state.category,
      difficulty: state.difficulty,
      ...extra
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(t("connectionError"));
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : t("connectionError")
    );
  }

  return data;
}

async function performAction(action, extra = {}, errorKey = "connectionError") {
  if (state.busy) return;

  clearNotice();
  setBusy(true);

  try {
    const data = await apiRequest(action, extra);
    applyServerState(data);
    return data;
  } catch (error) {
    showNotice(error.message || t(errorKey), "error");
    return null;
  } finally {
    setBusy(false);
    updateCards();
  }
}

async function startGame() {
  state.language = elements.languageSelect?.value || "ar";
  state.category = elements.categorySelect?.value || "football";
  state.difficulty = elements.difficultySelect?.value || "medium";

  state.round = 1;
  state.humanScore = 0;
  state.aiScore = 0;
  state.redCardUsed = false;
  state.blueCardUsed = false;

  const result = await performAction("start", {
    round: 1
  }, "startError");

  if (!result) return;

  state.active = true;

  if (elements.chatLog) {
    elements.chatLog.replaceChildren();
  }

  if (elements.questionInput) {
    elements.questionInput.disabled = false;
    elements.questionInput.value = "";
  }

  if (elements.guessInput) {
    elements.guessInput.disabled = false;
    elements.guessInput.value = "";
  }

  if (elements.humanSecretStatus) {
    elements.humanSecretStatus.textContent = "بانتظار اختيار الشخصية";
  }

  setScreen("game");
  updateScoreboard(result.state || result);
  updateCards();
}

async function submitQuestion(event) {
  event?.preventDefault();

  if (!state.active || state.busy) return;

  const question = elements.questionInput?.value.trim();

  if (!question) {
    showNotice(t("enterQuestion"), "warning");
    return;
  }

  const result = await performAction("ask_question", {
    question
  }, "questionError");

  if (result && elements.questionInput) {
    elements.questionInput.value = "";
    elements.questionInput.focus();
  }
}

async function submitAnswer(event) {
  event?.preventDefault();

  if (!state.active || state.busy) return;

  const selected = document.querySelector(
    '#answerChoices button[aria-pressed="true"]'
  );

  if (!selected) {
    showNotice(t("selectAnswer"), "warning");
    return;
  }

  const answer = selected.dataset.answer;

  const result = await performAction("answer_question", {
    answer
  }, "answerError");

  if (result) {
    document
      .querySelectorAll("#answerChoices button")
      .forEach((button) => button.setAttribute("aria-pressed", "false"));
  }
}

async function submitGuess(event) {
  event?.preventDefault();

  if (!state.active || state.busy) return;

  const guess = elements.guessInput?.value.trim();

  if (!guess) {
    showNotice(t("enterGuess"), "warning");
    return;
  }

  const result = await performAction("guess", {
    guess
  }, "guessError");

  if (result && elements.guessInput) {
    elements.guessInput.value = "";
  }
}

async function useCard(card) {
  if (!state.active || state.busy) return;

  if (card === "red" && state.redCardUsed) return;
  if (card === "blue" && state.blueCardUsed) return;

  const confirmed = window.confirm(
    card === "red"
      ? "هل تريد استخدام البطاقة الحمراء لطرح 3 أسئلة متتالية؟"
      : "هل تريد استخدام البطاقة الزرقاء لتغيير شخصيتك السرية؟"
  );

  if (!confirmed) return;

  const result = await performAction("use_card", {
    card
  }, "cardError");

  if (result) {
    if (card === "red") state.redCardUsed = true;
    if (card === "blue") state.blueCardUsed = true;

    updateCards();
  }
}

function exitGame() {
  if (state.active && !window.confirm(t("confirmExit"))) {
    return;
  }

  state.active = false;
  setScreen("setup");
  clearNotice();
}

function setupAnswerButtons() {
  if (!elements.answerChoices) return;

  const buttons = elements.answerChoices.querySelectorAll("button");

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      buttons.forEach((item) => {
        item.setAttribute("aria-pressed", "false");
      });

      button.setAttribute("aria-pressed", "true");
    });
  });
}

function setupLanguageButton() {
  if (!elements.languageButton) return;

  elements.languageButton.addEventListener("click", () => {
    const nextLanguage = state.language === "ar" ? "en" : "ar";

    state.language = nextLanguage;
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";

    if (elements.languageSelect) {
      elements.languageSelect.value = nextLanguage;
    }

    updateScoreboard();
  });
}

function initializeGame() {
  if (elements.startButton) {
    elements.startButton.addEventListener("click", startGame);
  }

  if (elements.exitButton) {
    elements.exitButton.addEventListener("click", exitGame);
  }

  if (elements.questionForm) {
    elements.questionForm.addEventListener("submit", submitQuestion);
  }

  if (elements.guessButton) {
    elements.guessButton.addEventListener("click", submitGuess);
  }

  if (elements.redCardButton) {
    elements.redCardButton.addEventListener("click", () => useCard("red"));
  }

  if (elements.blueCardButton) {
    elements.blueCardButton.addEventListener("click", () => useCard("blue"));
  }

  setupAnswerButtons();
  setupLanguageButton();

  setScreen("setup");
  updateScoreboard();
  updateCards();

  console.log("Guess Battle frontend initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGame);
} else {
  initializeGame();
}
