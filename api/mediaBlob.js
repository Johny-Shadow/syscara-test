export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "missing id" });
  }

  const { SYS_API_USER, SYS_API_PASS } = process.env;

  const url = `https://api.syscara.com/data/media/?media_id=${id}&file=blob`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64"),
      },
    });

    const contentType = response.headers.get("content-type");

    const buffer = await response.arrayBuffer();

    return res
      .setHeader("content-type", contentType || "application/octet-stream")
      .send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).json({
      error: "fetch failed",
      details: err.message,
    });
  }
}
