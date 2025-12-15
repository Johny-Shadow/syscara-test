// pages/api/media.js

export default async function handler(req, res) {
  try {
    const { SYS_API_USER, SYS_API_PASS } = process.env;
    const { id } = req.query;

    if (!SYS_API_USER || !SYS_API_PASS) {
      return res.status(500).json({
        error:
          "Fehlende ENV Variablen (SYS_API_USER, SYS_API_PASS) für Syscara",
      });
    }

    if (!id) {
      return res.status(400).json({ error: "Missing query param ?id=" });
    }

    // Syscara-URL: liefert JSON mit Base64-Blob
    const url = `https://api.syscara.com/data/media/?media_id=[${encodeURIComponent(
      id
    )}]`;

    const response = await fetch(url, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Syscara media error:", text);
      return res
        .status(502)
        .json({ error: "Syscara Media Request fehlgeschlagen", details: text });
    }

    const json = await response.json();

    // Antwortstruktur ist z.B. { "1942420": { id, type, file: "<base64>", ... } }
    const keys = Object.keys(json);
    if (!keys.length) {
      return res.status(404).json({ error: "Kein Media-Eintrag gefunden" });
    }

    const media = json[keys[0]];
    const base64 = media.file;
    const type = (media.type || "jpg").toLowerCase();

    if (!base64) {
      return res.status(500).json({ error: "Keine Datei (file) im Media-Objekt" });
    }

    const buffer = Buffer.from(base64, "base64");

    const mimeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const mime = mimeMap[type] || "application/octet-stream";

    // 👉 WICHTIG: wirklich als Bild ausliefern
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", buffer.length);
    // Caching kannst du nach Geschmack anpassen
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("Media proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
