// pages/api/media.js

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing media id" });
    }

    // Original-Syscara Bild-URL
    const url = `https://api.syscara.com/media/${id}`;

    // Datei abrufen
    const sysRes = await fetch(url);

    if (!sysRes.ok) {
      const text = await sysRes.text();
      console.error("Syscara media error:", text);

      return res.status(sysRes.status).json({
        error: "Failed to fetch media from Syscara",
        details: text,
      });
    }

    // Content-Type übernehmen
    const contentType = sysRes.headers.get("content-type");

    // Wenn kein Bild → abbrechen
    if (!contentType || !contentType.startsWith("image/")) {
      const text = await sysRes.text();
      console.error("❌ Kein Bildformat:", contentType, text);

      return res.status(400).json({
        error: "Not an image",
        contentType,
        body: text,
      });
    }

    // Header für Webflow setzen
    res.setHeader("Content-Type", contentType);

    // Stream an Webflow weiterleiten
    const arrayBuffer = await sysRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.send(buffer);
  } catch (err) {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err.message });
  }
}
