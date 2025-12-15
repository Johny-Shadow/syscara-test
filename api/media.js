// pages/api/media.js

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing ?id=" });
    }

    const user = process.env.SYS_API_USER;
    const pass = process.env.SYS_API_PASS;

    const url = `https://api.syscara.com/data/media/?media_id=${id}`;

    const response = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();

    if (!json[id] || !json[id].file) {
      return res.status(500).json({
        error: "Ungültige Antwort von Syscara",
        details: json,
      });
    }

    const item = json[id];

    return res.status(200).json({
      ok: true,
      id,
      fileName: item.name,
      base64: item.file,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


