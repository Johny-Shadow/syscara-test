export default async function handler(req, res) {
  try {
    const baseUrl = "https://api.syscara.com";

    // Basic Auth aus deinen Vercel-Variablen
    const auth = Buffer
      .from(`${process.env.SYS_API_USER}:${process.env.SYS_API_PASS}`)
      .toString("base64");

    // Call zum Syscara Endpoint /sale/ads/
    const response = await fetch(`${baseUrl}/sale/ads/`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Syscara error ${response.status}: ${text}`);
    }

    const data = await response.json();

    // Nur das erste Inserat zurückgeben (Browser stürzt sonst ab)
    const firstKey = Object.keys(data)[0];
    const ad = data[firstKey];

    res.status(200).json({
      id: ad.id,
      name: [
        ad.model?.producer,
        ad.model?.series,
        ad.model?.model
      ].filter(Boolean).join(" "),
      type: ad.type,
      condition: ad.condition,
      location: ad.location?.name ?? null,
      firstImageId: ad.media?.find((m) => m.group === "image")?.id ?? null,
      mediaCount: ad.media?.length ?? 0,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
