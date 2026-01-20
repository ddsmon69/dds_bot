const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PAGE_TOKEN = process.env.PAGE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const VERIFY_TOKEN = "dds_bot2026"; // Meta дээр бичсэнтэй яг адил

// =================================================
// 👉 WEBHOOK VERIFY (FACEBOOK CALLBACK CHECK)
// =================================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    console.log("❌ VERIFY FAILED");
    res.sendStatus(403);
  }
});

// =================================================
// 👉 MESSAGE RECEIVE
// =================================================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    // 🔒 Message биш эвент бол алгасна
    if (!messaging || !messaging.message || !messaging.message.text) {
      console.log("⚠️ Non-message event received");
      return res.sendStatus(200);
    }

    const text = messaging.message.text;
    const user = messaging.sender.id;

    console.log("📩 Incoming:", text);

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

    // 👉 SEND BACK TO FACEBOOK
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`,
      {
        recipient: { id: user },
        message: { text: reply }
      }
    );

    console.log("✅ Replied:", reply);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// =================================================
// ROOT
// =================================================
app.get("/", (req, res) => {
  res.send("🤖 DDS BOT is running!");
});

// =================================================
// RENDER PORT FIX
// =================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 BOT RUNNING ON", PORT));
