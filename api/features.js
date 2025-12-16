// pages/api/features.js

export default async function handler(req, res) {
  try {
    const { SYS_API_USER, SYS_API_PASS } = process.env;

    if (!SYS_API_USER || !SYS_API_PASS) {
      return res.status(500).json({
        error: "Fehlende ENV Variablen (SYS_API_USER, SYS_API_PASS)",
      });
    }

    // 🔹 Alle Fahrzeuge laden
    const sysUrl = "https://api.syscara.com/sale/ads/";

    const response = await fetch(sysUrl, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "Syscara Request fehlgeschlagen",
        details: text,
      });
    }

    const data = await response.json();

    // 🔹 Feature-Zähler
    const featureCounter = {};

    // Syscara liefert { "135965": { ... }, ... }
    for (const key of Object.keys(data)) {
      const ad = data[key];
      const features = Array.isArray(ad.features) ? ad.features : [];

      features.forEach((feature) => {
        if (!featureCounter[feature]) {
          featureCounter[feature] = 0;
        }
        featureCounter[feature]++;
      });
    }

    // 🔹 Sortieren nach Häufigkeit
    const sortedFeatures = Object.entries(featureCounter)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count]) => ({
        feature,
        count,
      }));

    return res.status(200).json({
      totalVehicles: Object.keys(data).length,
      totalFeatures: sortedFeatures.length,
      features: sortedFeatures,
    });
  } catch (err) {
    console.error("Feature Scan Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
