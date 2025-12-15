import { mapVehicle } from "./map.js";

const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN;
const WEBFLOW_COLLECTION = process.env.WEBFLOW_COLLECTION_ID;

// Limit Webflow to 60 requests/min → 1 request / 1100ms
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function webflowRequest(url, method = "GET", body = null) {
  await wait(1100);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${WEBFLOW_TOKEN}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error("Webflow Error:", json);
    throw new Error(json.msg || "Webflow API error");
  }
  return json;
}

async function getWebflowItems() {
  const url = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION}/items`;
  const res = await webflowRequest(url);
  return res.items || [];
}

async function uploadImageToWebflow(imageId) {
  return `https://source.syscara.com/media/${imageId}/full`; 
}

function hasChanged(webflowItem, mapped) {
  for (const key of Object.keys(mapped)) {
    const wfVal = webflowItem.fieldData?.[key];
    const newVal = mapped[key];

    if (Array.isArray(newVal)) {
      if (JSON.stringify(wfVal || []) !== JSON.stringify(newVal)) return true;
    } else {
      if ((wfVal || "") !== (newVal || "")) return true;
    }
  }
  return false;
}

async function createItem(mapped) {
  console.log(`➕ CREATE ${mapped.name}`);

  if (mapped.hauptbild) {
    mapped.hauptbild = await uploadImageToWebflow(mapped.hauptbild);
  }

  if (mapped.galerie?.length) {
    mapped.galerie = await Promise.all(
      mapped.galerie.map((imgId) => uploadImageToWebflow(imgId))
    );
  }

  const url = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION}/items`;
  return webflowRequest(url, "POST", { fieldData: mapped });
}

async function updateItem(itemId, mapped) {
  console.log(`♻ UPDATE ${mapped.name}`);

  if (mapped.hauptbild) {
    mapped.hauptbild = await uploadImageToWebflow(mapped.hauptbild);
  }

  if (mapped.galerie?.length) {
    mapped.galerie = await Promise.all(
      mapped.galerie.map((imgId) => uploadImageToWebflow(imgId))
    );
  }

  const url = `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION}/items/${itemId}`;
  return webflowRequest(url, "PATCH", { fieldData: mapped });
}

export async function runDeltaSync(syscaraData) {
  console.log("🚀 Starting Delta Sync…");

  const mappedVehicles = Object.values(syscaraData).map((v) => mapVehicle(v));
  const webflowItems = await getWebflowItems();

  const byId = {};
  for (const item of webflowItems) {
    const gid = item.fieldData?.geraet_id;
    if (gid) byId[gid] = item;
  }

  for (const vehicle of mappedVehicles) {
    const { originalId, mapped } = vehicle;

    const existing = byId[String(originalId)];

    if (!existing) {
      await createItem(mapped);
      continue;
    }

    const changed = hasChanged(existing, mapped);
    if (!changed) {
      console.log(`✔ NO CHANGE for ${mapped.name}`);
      continue;
    }

    await updateItem(existing.id, mapped);
  }

  console.log("✅ Sync completed");
}
