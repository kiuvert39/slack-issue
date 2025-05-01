const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/create-issue", async (req, res) => {
  const { text, user_name } = req.body;

  const [titleRaw, ...descParts] = text.split("|");
  const title = titleRaw?.trim();
  const body = descParts.join("|").trim();

  if (!title || !body) {
    return res.send("❌ Format: `/create-issue Title | Description`");
  }

  try {
    await axios.post(
      `https://api.github.com/repos/${process.env.REPO}/actions/workflows/create-issue.yml/dispatches`,
      {
        ref: "main",
        inputs: {
          title,
          body: `Created by @${user_name} via Slack:\n\n${body}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    res.send(`✅ Issue creation triggered for *${title}*`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("❌ Failed to create issue.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

