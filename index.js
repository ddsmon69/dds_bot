const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PAGE_TOKEN = process.env.PAGE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

app.post("/webhook", async (req, res) => {
  let msg = req.body.entry[0].messaging[0];
  let text = msg.message.text;
  let user = msg.sender.id;

  const gpt = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: text }]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`
      }
    }
  );

  let reply = gpt.data.choices[0].message.content;

  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`,
    {
      recipient: { id: user },
      message: { text: reply }
    }
  );

  res.sendStatus(200);
});

app.listen(3000, () => console.log("BOT RUNNING"));
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "dds_bot ";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
app.get("/", (req, res) => {
  res.send("🤖 DDS BOT is running!");
});


