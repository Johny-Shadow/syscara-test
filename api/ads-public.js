// pages/api/ads-public.js

export default async function handler(req, res) {
  try {
    const { SYS_API_USER, SYS_API_PASS } = process.env;

    if (!SYS_API_USER || !SYS_API_PASS) {
      return res.status(500).json({ error: "Missing SYS_API_USER / SYS_API_PASS" });
    }

    const auth = Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64");

    // Syscara: komplette Liste
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
      return res.status(500).json({ error: "Invalid JSON from Syscara", raw: text });
    }

    const allowedTypes = new Set(["Reisemobil", "Caravan"]);

    let totalVehicles = 0;
    let publicVehicles = 0;
    let reisemobile = 0;
    let caravans = 0;

    const excludedReasons = {
      not_visible: 0,
      not_market: 0,
      wrong_type: 0,
      no_price: 0,
    };

    const sampleIncluded = [];
    const sampleExcluded = [];

    // data ist bei euch i.d.R. ein Objekt { "135965": { ... }, ... }
    for (const [key, raw] of Object.entries(data || {})) {
      totalVehicles++;

      // normalize: ID aus key nehmen, falls raw.id fehlt
      const ad = raw && typeof raw === "object" ? raw : {};
      const id = ad.id ?? Number(key) ?? key;

      const type = ad.type || "";
      const visible = ad.properties?.visible === true;
      const market = ad.properties?.market === true;

      const offer = ad.prices?.offer;
      const hasPrice = offer != null && String(offer) !== "" && Number(offer) > 0;

      // Filterlogik
      let reason = null;
      if (!visible) reason = "not_visible";
      else if (!market) reason = "not_market";
      else if (!allowedTypes.has(type)) reason = "wrong_type";
      else if (!hasPrice) reason = "no_price";

      if (reason) {
        excludedReasons[reason]++;

        if (sampleExcluded.length < 10) {
          sampleExcluded.push({
            id,
            status: ad.status,
            type,
            visible,
            market,
            offer: offer ?? null,
            reason,
          });
        }
        continue;
      }

      // included
      publicVehicles++;
      if (type === "Reisemobil") reisemobile++;
      if (type === "Caravan") caravans++;

      if (sampleIncluded.length < 10) {
        sampleIncluded.push({
          id,
          status: ad.status,
          type,
          visible,
          market,
          producer: ad.model?.producer || "",
          series: ad.model?.series || "",
          model: ad.model?.model || "",
          offer: offer ?? null,
        });
      }
    }

    return res.status(200).json({
      totalVehicles,
      publicVehicles,
      reisemobile,
      caravans,
      excluded: totalVehicles - publicVehicles,
      excludedReasons,
      sampleIncluded,
      sampleExcluded,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
