// pages/api/sync.js
import { mapVehicle } from "../libs/map.js";

let featureMapCache = null;

// ----------------------------------------------------
// Webflow Helper
// ----------------------------------------------------
async function webflowRequest(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ----------------------------------------------------
// Feature Map laden
// ----------------------------------------------------
async function getFeatureMap(token, collectionId) {
  if (featureMapCache) return featureMapCache;

  const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=1000`;
  const data = await webflowRequest(url, token);

  const map = {};
  for (const item of data.items || []) {
    const slug = item.fieldData?.slug;
    if (slug) map[slug] = item.id;
  }

  featureMapCache = map;
  return map;
}

// ----------------------------------------------------
function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

// ----------------------------------------------------
// API Handler
// ----------------------------------------------------
export default async function handler(req, res) {
  try {
    const {
      WEBFLOW_TOKEN,
      WEBFLOW_COLLECTION,
      WEBFLOW_FEATURES_COLLECTION,
      SYS_API_USER,
      SYS_API_PASS,
    } = process.env;

    // 🔹 Syscara laden
    const sysId = 135965;
    const sysRes = await fetch(
      `https://api.syscara.com/sale/ads/${sysId}`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64"),
        },
      }
    );

    if (!sysRes.ok) {
      return res.status(500).json({ error: "Syscara error" });
    }

   const rawAd = await sysRes.json();

// 🔥 WICHTIG: echtes Fahrzeug extrahieren
const ad =
  rawAd && typeof rawAd === "object" && rawAd[sysId]
    ? rawAd[sysId]
    : rawAd;

const mapped = mapVehicle(ad);


    // ------------------------------------------------
    // 🖼️ Bilder aus media-cache
    // ------------------------------------------------
    const origin = getOrigin(req);

    if (mapped["media-cache"]) {
      const cache = JSON.parse(mapped["media-cache"]);

      if (cache.hauptbild) {
        mapped.hauptbild = `${origin}/api/media?id=${cache.hauptbild}`;
      }

      if (Array.isArray(cache.galerie)) {
        mapped.galerie = cache.galerie
          .slice(0, 25)
          .map((id) => `${origin}/api/media?id=${id}`);
      }

      if (cache.grundriss) {
        mapped.grundriss = `${origin}/api/media?id=${cache.grundriss}`;
      }
    }

    // ------------------------------------------------
    // 🔹 Features verknüpfen
    // ------------------------------------------------
    const featureMap = await getFeatureMap(
      WEBFLOW_TOKEN,
      WEBFLOW_FEATURES_COLLECTION
    );

    const featureIds = (mapped.featureSlugs || [])
      .map((slug) => featureMap[slug])
      .filter(Boolean);

    delete mapped.featureSlugs;
    mapped.features = featureIds;

    // ------------------------------------------------
    // 🔹 Webflow Create
    // ------------------------------------------------
    const body = {
      items: [{ fieldData: mapped }],
    };

    const wfRes = await fetch(
      `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WEBFLOW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const wfJson = await wfRes.json();
    if (!wfRes.ok) throw wfJson;

    return res.status(200).json({
      ok: true,
      vehicle: mapped.name,
      images: {
        hauptbild: !!mapped.hauptbild,
        galerie: mapped.galerie?.length || 0,
        grundriss: !!mapped.grundriss,
      },
      featuresLinked: featureIds.length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e });
  }
}
