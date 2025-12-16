// pages/api/ads-public.js

function toNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req, res) {
  try {
    const { SYS_API_USER, SYS_API_PASS } = process.env;

    if (!SYS_API_USER || !SYS_API_PASS) {
      return res.status(500).json({
        error: "Missing ENV vars (SYS_API_USER, SYS_API_PASS)",
      });
    }

    const auth = Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64");

    // Alle Ads (Syscara liefert hier typischerweise ein Objekt { "135965": {...}, ... }
    const response = await fetch("https://api.syscara.com/sale/ads/", {
      headers: { Authorization: `Basic ${auth}` },
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(500).json({
        error: "Syscara returned an error",
        status: response.status,
        message: text,
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON from Syscara",
        raw: text,
      });
    }

    const ids = Object.keys(data || {});
    const all = ids.map((id) => {
      const ad = data[id];
      // Syscara liefert id manchmal als Key, manchmal im Objekt
      const resolvedId = ad?.id != null ? ad.id : Number(id);
      return { id: resolvedId, ...ad };
    });

    // -----------------------------
    // “LIVE”-Filter fürs Embed-Testen
    // -----------------------------
    const included = [];
    const excludedReasons = {
      not_public: 0,
      wrong_type: 0,
      no_price: 0,
    };

    for (const ad of all) {
      const isPublic = ad?.status === "BE"; // "BE" war bei dir bislang “sichtbar/öffentlich”
      if (!isPublic) {
        excludedReasons.not_public++;
        continue;
      }

      const isVehicle = ad?.type === "Reisemobil" || ad?.type === "Caravan";
      if (!isVehicle) {
        excludedReasons.wrong_type++;
        continue;
      }

      // Viele deiner Fahrzeuge hatten category: [] — also nicht darauf verlassen.
      // Stattdessen: “live” = hat irgendeinen Preis (Verkauf oder Miete)
      const offer = toNumber(ad?.prices?.offer);
      const rent = toNumber(ad?.prices?.rent);
      const hasAnyPrice = offer > 0 || rent > 0;

      if (!hasAnyPrice) {
        excludedReasons.no_price++;
        continue;
      }

      included.push(ad);
    }

    // Breakdown
    const reisemobile = included.filter((a) => a.type === "Reisemobil").length;
    const caravans = included.filter((a) => a.type === "Caravan").length;

    // Samples (klein halten)
    const sampleIncluded = included.slice(0, 10).map((a) => ({
      id: a.id,
      status: a.status,
      type: a.type,
      producer: a.model?.producer || "",
      series: a.model?.series || "",
      model: a.model?.model || "",
      offer: a.prices?.offer ?? null,
      rent: a.prices?.rent ?? null,
    }));

    return res.status(200).json({
      totalVehicles: all.length,
      publicVehicles: included.length,
      reisemobile,
      caravans,
      excluded: all.length - included.length,
      excludedReasons,
      sampleIncluded,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
