const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PAGE_TOKEN = process.env.PAGE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const VERIFY_TOKEN = "dds_bot2026";

// =================================================
// WEBHOOK VERIFY
// =================================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  console.log("❌ VERIFY FAILED");
  return res.sendStatus(403);
});

// =================================================
// RECEIVE MESSAGE
// =================================================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const event = entry?.messaging?.[0];

    // 🔒 message биш бол шууд буцаана
    if (!event || !event.message || !event.message.text) {
      console.log("⚠️ Non-text event ignored");
      return res.sendStatus(200);
    }

    const text = event.message.text;
    const user = event.sender.id;

    console.log("📩 USER:", text);

    // 👉 OPENAI
    const gpt = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gpt.data.choices[0].message.content;

    // 👉 SEND BACK
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`,
      {
        recipient: { id: user },
        message: { text: reply }
      }
    );

    console.log("✅ BOT:", reply);
    res.sendStatus(200);

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// =================================================
app.get("/", (req, res) => {
  res.send("🤖 DDS BOT is running!");
});

// =================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 BOT RUNNING ON", PORT));
