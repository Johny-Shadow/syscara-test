// pages/api/delta-sync.js
import { mapVehicle } from "../libs/map.js";
import crypto from "crypto";
import { kv } from "@vercel/kv";

const WEBFLOW_BASE = "https://api.webflow.com/v2";
const COLD_OFFSET_KEY = "delta-sync-cold-offset";
let featureMapCache = null;

/* ----------------------------------------------------
   HASH
---------------------------------------------------- */
function createHash(obj) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}

/* ----------------------------------------------------
   WEBFLOW REQUEST
---------------------------------------------------- */
async function wf(url, method, token, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = res.status !== 204 ? await res.json() : null;
  if (!res.ok) throw json || await res.text();
  return json;
}

/* ----------------------------------------------------
   LIVE UNPUBLISH
---------------------------------------------------- */
async function unpublishLiveItem(collectionId, itemId, token) {
  return wf(
    `${WEBFLOW_BASE}/collections/${collectionId}/items/${itemId}/live`,
    "DELETE",
    token
  );
}

/* ----------------------------------------------------
   FEATURE MAP
---------------------------------------------------- */
async function getFeatureMap(token, collectionId) {
  if (featureMapCache) return featureMapCache;

  const map = {};
  let offset = 0;

  while (true) {
    const res = await wf(
      `${WEBFLOW_BASE}/collections/${collectionId}/items?limit=100&offset=${offset}`,
      "GET",
      token
    );

    for (const item of res.items || []) {
      const slug = item.fieldData?.slug;
      if (slug) map[slug] = item.id;
    }

    if (!res.items || res.items.length < 100) break;
    offset += 100;
  }

  featureMapCache = map;
  return map;
}

/* ----------------------------------------------------
   PUBLISH ITEM
---------------------------------------------------- */
async function publishItem(collectionId, token, itemId) {
  return wf(
    `${WEBFLOW_BASE}/collections/${collectionId}/items/publish`,
    "POST",
    token,
    { itemIds: [itemId] }
  );
}

/* ----------------------------------------------------
   PROCESS BATCH
---------------------------------------------------- */
async function processBatch({
  ads,
  wfMap,
  featureMap,
  token,
  collectionId,
  dryRun,
  stats,
}) {
  for (const ad of ads) {
    try {
      const mapped = mapVehicle(ad);

      /* ------------------------------------------
         🚗 NEUWAGEN-KILOMETER-FIX
      ------------------------------------------ */
      const hasErstzulassung =
        mapped.erstzulassung &&
        String(mapped.erstzulassung).trim() !== "";

      const kmParsed =
        typeof mapped.kilometer === "number"
          ? mapped.kilometer
          : parseInt(mapped.kilometer, 10);

      const hasValidKm =
        Number.isFinite(kmParsed) && kmParsed > 0;

      if (!hasErstzulassung && !hasValidKm) {
        mapped.kilometer = "0"; // STRING für Webflow
      }
      /* ------------------------------------------ */

      const featureIds = (mapped.featureSlugs || [])
        .map((s) => featureMap[s])
        .filter(Boolean);

      delete mapped.featureSlugs;
      mapped.features = featureIds;

      const hash = createHash(mapped);
      mapped["sync-hash"] = hash;

      const existing = wfMap.get(mapped["fahrzeug-id"]);

      if (existing) {
        if (existing.fieldData?.["sync-hash"] === hash) {
          stats.skipped++;
          continue;
        }

        if (!dryRun) {
          await wf(
            `${WEBFLOW_BASE}/collections/${collectionId}/items/${existing.id}`,
            "PATCH",
            token,
            { isDraft: false, isArchived: false, fieldData: mapped }
          );
          await publishItem(collectionId, token, existing.id);
        }

        stats.updated++;
      } else {
        if (!dryRun) {
          const created = await wf(
            `${WEBFLOW_BASE}/collections/${collectionId}/items`,
            "POST",
            token,
            { isDraft: false, isArchived: false, fieldData: mapped }
          );
          await publishItem(collectionId, token, created.id);
        }
        stats.created++;
      }
    } catch (e) {
      stats.errors.push({ syscaraId: ad?.id, error: e });
    }
  }
}

/* ----------------------------------------------------
   API HANDLER
---------------------------------------------------- */
export default async function handler(req, res) {
  try {
    const {
      WEBFLOW_TOKEN,
      WEBFLOW_COLLECTION,
      WEBFLOW_FEATURES_COLLECTION,
      SYS_API_USER,
      SYS_API_PASS,
    } = process.env;

    // ✅ limit jetzt steuerbar, max 25
    const limit = Math.min(
      parseInt(req.query.limit || "25", 10),
      25
    );

    const dryRun = req.query.dry === "1";

    /* ----------------------------------------------
       SYSCARA
    ---------------------------------------------- */
    const auth =
      "Basic " +
      Buffer.from(`${SYS_API_USER}:${SYS_API_PASS}`).toString("base64");

    const sysRes = await fetch("https://api.syscara.com/sale/ads/", {
      headers: { Authorization: auth },
    });
    if (!sysRes.ok) throw await sysRes.text();

    const sysAds = Object.values(await sysRes.json());
    const sysMap = new Map(sysAds.map((a) => [String(a.id), a]));

    /* ----------------------------------------------
       WEBFLOW ITEMS
    ---------------------------------------------- */
    const wfMap = new Map();
    let wfOffset = 0;

    while (true) {
      const res = await wf(
        `${WEBFLOW_BASE}/collections/${WEBFLOW_COLLECTION}/items?limit=100&offset=${wfOffset}`,
        "GET",
        WEBFLOW_TOKEN
      );
      for (const item of res.items || []) {
        const fid = item.fieldData?.["fahrzeug-id"];
        if (fid) wfMap.set(String(fid), item);
      }
      if (!res.items || res.items.length < 100) break;
      wfOffset += 100;
    }

    const featureMap = await getFeatureMap(
      WEBFLOW_TOKEN,
      WEBFLOW_FEATURES_COLLECTION
    );

    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      deleted: 0,
      errors: [],
    };

    /* ----------------------------------------------
       HOT PATH
    ---------------------------------------------- */
    await processBatch({
      ads: sysAds.slice(0, limit),
      wfMap,
      featureMap,
      token: WEBFLOW_TOKEN,
      collectionId: WEBFLOW_COLLECTION,
      dryRun,
      stats,
    });

    /* ----------------------------------------------
       COLD CRAWL
    ---------------------------------------------- */
    const coldOffset = (await kv.get(COLD_OFFSET_KEY)) || 0;
    const coldBatch = sysAds.slice(coldOffset, coldOffset + limit);

    await processBatch({
      ads: coldBatch,
      wfMap,
      featureMap,
      token: WEBFLOW_TOKEN,
      collectionId: WEBFLOW_COLLECTION,
      dryRun,
      stats,
    });

    const nextOffset =
      coldOffset + limit >= sysAds.length ? 0 : coldOffset + limit;

    if (!dryRun) {
      await kv.set(COLD_OFFSET_KEY, nextOffset);
    }

    /* ----------------------------------------------
       DELETES
    ---------------------------------------------- */
    for (const [fid, item] of wfMap.entries()) {
      if (!sysMap.has(fid)) {
        if (!dryRun) {
          await unpublishLiveItem(
            WEBFLOW_COLLECTION,
            item.id,
            WEBFLOW_TOKEN
          );
          await wf(
            `${WEBFLOW_BASE}/collections/${WEBFLOW_COLLECTION}/items/${item.id}`,
            "DELETE",
            WEBFLOW_TOKEN
          );
        }
        stats.deleted++;
      }
    }

    return res.status(200).json({
      ok: true,
      totals: {
        syscara: sysAds.length,
        webflow: wfMap.size,
      },
      hotBatch: limit,
      coldOffset,
      nextColdOffset: nextOffset,
      ...stats,
    });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
}
