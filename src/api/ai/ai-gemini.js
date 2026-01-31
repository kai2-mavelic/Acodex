const axios = require("axios");

module.exports = function (app) {
  app.get("/ai/gemini", async (req, res) => {
    const { text, prompt, session } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi."
      });
    }

    // 🔥 Default prompt AcodexAI
    const defaultPrompt = `
kamu adalah AcodexAI yang sangat pintar, excited, fleksibel, dan menyenangkan.
gunakan gaya aku–kamu, boleh emoji secukupnya.
fokus bahasa Indonesia dan Inggris.
`.trim();

    const instruction =
      prompt && prompt.trim().length > 0 ? prompt : defaultPrompt;

    try {
      let resumeArray = null;
      let cookie = null;
      let savedInstruction = instruction;

      // 🔁 restore session jika ada
      if (session) {
        try {
          const parsed = JSON.parse(
            Buffer.from(session, "base64").toString()
          );
          resumeArray = parsed.resumeArray;
          cookie = parsed.cookie;
          savedInstruction = instruction || parsed.instruction;
        } catch (e) {
          console.error("Session error:", e.message);
        }
      }

      // 🍪 ambil cookie kalau belum ada
      if (!cookie) {
        const { headers } = await axios.post(
          "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&rt=c",
          "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
          {
            headers: {
              "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
            }
          }
        );
        cookie = headers["set-cookie"]?.[0]?.split("; ")[0] || "";
      }

      // 🧠 request Gemini
      const requestBody = [
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
        [1],
      ];

      const payload = [null, JSON.stringify(requestBody)];

      const { data } = await axios.post(
        "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?rt=c",
        new URLSearchParams({
          "f.req": JSON.stringify(payload)
        }).toString(),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            cookie
          }
        }
      );

      // 🔍 parse response
      const match = Array.from(data.matchAll(/^\d+\n(.+?)\n/gm)).reverse();
      const realArray = JSON.parse(match[3][1]);
      const parsed = JSON.parse(realArray[0][2]);

      const answer = parsed[4][0][1][0]
        .replace(/\*\*(.+?)\*\*/g, "*$1*");

      const newResumeArray = [...parsed[1], parsed[4][0][0]];

      const newSession = Buffer.from(
        JSON.stringify({
          resumeArray: newResumeArray,
          cookie,
          instruction: savedInstruction
        })
      ).toString("base64");

      res.json({
        status: true,
        creator: "Kado",
        model: "gemini",
        prompt_used: instruction === defaultPrompt ? "default" : "custom",
        result: answer,
        session: newSession
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil respons dari Gemini.",
        error: err.message
      });
    }
  });
};
