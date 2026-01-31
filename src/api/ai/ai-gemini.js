const axios = require("axios");

/**
 * Gemini Scraper (stable parser)
 */
async function gemini({ text, prompt = "", sessionId = null }) {
  if (!text) throw new Error("Text is required");

  let resumeArray = null;
  let cookie = null;
  let instruction = prompt || "";

  // restore session
  if (sessionId) {
    try {
      const sess = JSON.parse(Buffer.from(sessionId, "base64").toString());
      resumeArray = sess.resumeArray || null;
      cookie = sess.cookie || null;
      instruction = prompt || sess.instruction || "";
    } catch {}
  }

  // get cookie
  if (!cookie) {
    const { headers } = await axios.post(
      "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc",
      "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      }
    );
    cookie = headers["set-cookie"]?.[0]?.split(";")[0];
    if (!cookie) throw new Error("Failed to get Gemini cookie");
  }

  const body = [
    [text, 0, null, null, null, null, 0],
    ["en-US"],
    resumeArray || ["", "", "", null, null, null, null, null, null, ""],
    null,
    null,
    null,
    [1],
    1,
    null,
    null,
    1,
    0,
    null,
    null,
    null,
    null,
    null,
    [[0]],
    1,
    null,
    null,
    null,
    null,
    null,
    ["", "", instruction, null, null, null, null, null, 0],
    null,
    null,
    1,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [1,2,3,4,5,6,7,8,9,10],
    1,
    null,
    null,
    null,
    null,
    [1],
  ];

  const payload = [null, JSON.stringify(body)];

  const { data } = await axios.post(
    "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
    new URLSearchParams({
      "f.req": JSON.stringify(payload),
    }).toString(),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        cookie,
      },
    }
  );

  // ===== SAFE PARSER =====
  const chunks = Array.from(data.matchAll(/^\d+\n(.+?)\n/gm));
  if (!chunks.length) throw new Error("Gemini response empty");

  let parsed;
  for (const c of chunks.reverse()) {
    try {
      const outer = JSON.parse(c[1]);
      parsed = JSON.parse(outer[0][2]);
      break;
    } catch {}
  }

  if (!parsed) throw new Error("Failed to parse Gemini response");

  const answer = parsed?.[4]?.[0]?.[1]?.[0];
  const resume = parsed?.[1];
  const last = parsed?.[4]?.[0]?.[0];

  if (!answer) throw new Error("Gemini answer empty");

  const newSessionId = Buffer.from(
    JSON.stringify({
      resumeArray: resume ? [...resume, last] : null,
      cookie,
      instruction,
    })
  ).toString("base64");

  return {
    text: answer,
    sessionId: newSessionId,
  };
}

/**
 * API Endpoint
 */
module.exports = function (app) {
  app.get("/ai/gemini", async (req, res) => {
    const { text, prompt, sessionId } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi.",
      });
    }

    try {
      const r = await gemini({
        text,
        prompt,
        sessionId,
      });

      res.json({
        status: true,
        creator: "Kado",
        model: "Gemini",
        prompt: prompt || null,
        result: r.text,
        sessionId: r.sessionId,
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        creator: "Kado",
        message: "Gagal mengambil respons dari Gemini.",
        error: e.message,
      });
    }
  });
};
