"use strict";

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Guess Battle API",
    aiConfigured: Boolean(ai)
  });
});

app.post("/api/game", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "الذكاء الاصطناعي غير مهيأ. أضف GEMINI_API_KEY إلى متغيرات البيئة في الاستضافة."
      });
    }

    const { action, language, category, difficulty, question, answer, guess, card } = req.body || {};

    const allowedActions = [
      "start",
      "ask_question",
      "answer_question",
      "guess",
      "use_card"
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: "إجراء غير صالح."
      });
    }

    /*
      هذه نقطة الاتصال الأولية فقط.
      لم نضف بعد إدارة المباراة أو الذاكرة أو البحث المباشر.
    */

    const prompt = `
You are the AI assistant for a guessing game called Guess Battle.

Language: ${String(language || "ar").slice(0, 10)}
Category: ${String(category || "football").slice(0, 40)}
Difficulty: ${String(difficulty || "medium").slice(0, 20)}
Action: ${action}

User question: ${String(question || "").slice(0, 500)}
User answer: ${String(answer || "").slice(0, 100)}
User guess: ${String(guess || "").slice(0, 200)}
Card: ${String(card || "").slice(0, 20)}

Return a concise response in the requested language.
Do not claim to have verified current facts unless you actually have.
Do not invent web sources.
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return res.json({
      success: true,
      message: result.text || "لم تصل إجابة نصية.",
      note: "هذا اتصال أولي بالنموذج؛ قواعد المباراة والبحث المباشر لم يكتمل تنفيذهما بعد."
    });
  } catch (error) {
    console.error("Guess Battle API error:", error.message);

    return res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Guess Battle server listening on port ${PORT}`);
});
