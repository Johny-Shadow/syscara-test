import { mapVehicle } from "./map.js";

// Webflow API v2 Request Wrapper
async function webflowRequest(url, method = "GET", body = null) {
  const token = process.env.WEBFLOW_TOKEN;

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "accept-version": "2.0.0"
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Webflow Error:", data);
    throw new Error("Webflow API error");
  }

  return data;
}



// ✔ Webflow API v2 – Item erstellen
async function createItem(collectionId, mapped) {
  const url = `https://api.webflow.com/v2/collections/${collectionId}/items`;

  const body = {
    name: mapped.name,
    slug: mapped.slug,
    isArchived: false,
    isDraft: false,

    fieldData: {
      hersteller: mapped.hersteller,
      serie: mapped.serie,
      modell: mapped.modell,
      "modell-zusatz": mapped["modell-zusatz"],

      zustand: mapped.zustand,
      fahrzeugart: mapped.fahrzeugart,
      fahrzeugtyp: mapped.fahrzeugtyp,

      ps: mapped.ps ?? "",
      kw: mapped.kw ?? "",
      kraftstoff: mapped.kraftstoff,
      getriebe: mapped.getriebe,

      beschreibung: mapped.beschreibung,
      "beschreibung-kurz": mapped["beschreibung-kurz"],

      kilometer: mapped.kilometer,
      baujahr: mapped.baujahr,
      preis: mapped.preis,

      breite: mapped.breite,
      hoehe: mapped.hoehe,
      laenge: mapped.laenge,

      "geraet-id": mapped["geraet-id"],

      hauptbild: mapped.hauptbild,
      galerie: mapped.galerie,

      "verkauf-miete": mapped["verkauf-miete"]
    }
  };

  return webflowRequest(url, "POST", body);
}



// ✔ Webflow API v2 – Item aktualisieren
async function updateItem(collectionId, itemId, mapped) {
  const url = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`;

  const body = {
    name: mapped.name,
    slug: mapped.slug,
    isArchived: false,
    isDraft: false,

    fieldData: {
      hersteller: mapped.hersteller,
      serie: mapped.serie,
      modell: mapped.modell,
      "modell-zusatz": mapped["modell-zusatz"],

      zustand: mapped.zustand,
      fahrzeugart: mapped.fahrzeugart,
      fahrzeugtyp: mapped.fahrzeugtyp,

      ps: mapped.ps ?? "",
      kw: mapped.kw ?? "",
      kraftstoff: mapped.kraftstoff,
      getriebe: mapped.getriebe,

      beschreibung: mapped.beschreibung,
      "beschreibung-kurz": mapped["beschreibung-kurz"],

      kilometer: mapped.kilometer,
      baujahr: mapped.baujahr,
      preis: mapped.preis,

      breite: mapped.breite,
      hoehe: mapped.hoehe,
      laenge: mapped.laenge,

      "geraet-id": mapped["geraet-id"],

      hauptbild: mapped.hauptbild,
      galerie: mapped.galerie,

      "verkauf-miete": mapped["verkauf-miete"]
    }
  };

  return webflowRequest(url, "PATCH", body);
}



// ✔ Alle bestehenden Webflow Items holen
async function getExistingWebflowItems(collectionId) {
  const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=1000`;
  const res = await webflowRequest(url, "GET");
  return res.items || [];
}



// ✔ DELTA_SYNC
export async function runDeltaSync(syscaraData) {
  console.log("🚀 Starting Delta Sync…");

  const collectionId = process.env.WEBFLOW_COLLECTION;

  const existingItems = await getExistingWebflowItems(collectionId);
  console.log(`📚 ${existingItems.length} bestehende Webflow-Einträge geladen`);

  const existingMap = {};
  for (const item of existingItems) {
    if (item.fieldData && item.fieldData["geraet-id"]) {
      existingMap[item.fieldData["geraet-id"]] = item;
    }
  }

  for (const id of Object.keys(syscaraData)) {
    const vehicle = syscaraData[id];
    const mapped = mapVehicle(vehicle);

    try {
      const existing = existingMap[mapped["geraet-id"]];

      if (!existing) {
        console.log(`➕ Neues Fahrzeug ${mapped["geraet-id"]}`);
        await createItem(collectionId, mapped);
      } else {
        console.log(`🔄 Update Fahrzeug ${mapped["geraet-id"]}`);
        await updateItem(collectionId, existing._id, mapped);
      }

    } catch (err) {
      console.error(`❌ Fehler bei Fahrzeug ${id}: ${err.message}`);
    }
  }

  console.log("🎉 Delta Sync abgeschlossen");
}
