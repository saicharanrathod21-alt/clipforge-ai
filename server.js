require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/script", async (req, res) => {
  try {
    const { prompt, style, language, duration } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: "Please describe the video you want." });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "Add your OPENAI_API_KEY in the Replit Secrets / environment variables to enable AI script generation."
      });
    }

    const instruction = `Create a ready-to-produce video script based on the user's idea.
Style: ${style || "Educational presenter"}
Language: ${language || "English"}
Target duration: ${duration || "30 seconds"}.
Return valid JSON only, with this shape:
{
 "title": "short engaging title",
 "description": "one or two sentence video description",
 "scenes": [
   {"time":"0-5s","visual":"what viewers see","voiceover":"spoken narration","subtitle":"short on-screen subtitle"}
 ]
}
Make the narration fit the requested duration. Use concise, natural spoken language.
User idea: ${prompt}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert short-form video scriptwriter and storyboard creator." },
          { role: "user", content: instruction }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "The AI script service returned an error."
      });
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "No script was returned." });
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Could not generate the script. Please try again." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`AI Video Studio running on port ${port}`));