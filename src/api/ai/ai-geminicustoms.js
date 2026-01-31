const axios = require("axios");

/**
 * Gemini custom scraper
 */
async function gemini({ message, instruction = "", sessionId = null }) {
  if (!message) throw new Error("Message is required.");

  let resumeArray = null;
  let cookie = null;
  let savedInstruction = instruction;

  if (sessionId) {
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionId, "base64").toString()
      );
      resumeArray = sessionData.resumeArray;
      cookie = sessionData.cookie;
      savedInstruction = instruction || sessionData.instruction || "";
    } catch {}
  }

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
    cookie = headers["set-cookie"]?.[0]?.split("; ")[0] || "";
  }

  const body = [
    [message, 0, null, null, null, null, 0],
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
    ["", "", savedInstruction, null, null, null, null, null, 0],
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
    new URLSearchParams({ "f.req": JSON.stringify(payload) }).toString(),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        cookie,
      },
    }
  );

  const match = Array.from(data.matchAll(/^\d+\n(.+?)\n/gm));
  const real = JSON.parse(match.reverse()[3][1]);
  const parsed = JSON.parse(real[0][2]);

  const newResumeArray = [...parsed[1], parsed[4][0][0]];
  const text = parsed[4][0][1][0];

  const newSessionId = Buffer.from(
    JSON.stringify({
      resumeArray: newResumeArray,
      cookie,
      instruction: savedInstruction,
    })
  ).toString("base64");

  return { text, sessionId: newSessionId };
}

module.exports = function (app) {
  app.get("/ai/geminicostums", async (req, res) => {
    const { text, prompt, sessionId } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi.",
      });
    }

    try {
      const result = await gemini({
        message: text,
        instruction: prompt || "",
        sessionId: sessionId || null,
      });

      res.json({
        status: true,
        creator: "Kado",
        model: "Gemini",
        prompt: prompt || null,
        result: result.text,
        sessionId: result.sessionId,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil respons dari Gemini.",
        error: err.message,
      });
    }
  });
};
