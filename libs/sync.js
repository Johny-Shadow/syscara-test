import { mapVehicle } from "./map.js";

// ------------------------------------------------------
// Webflow API Wrapper (POST / PATCH)
// ------------------------------------------------------
async function webflowRequest(method, url, body) {
  const token = process.env.WEBFLOW_TOKEN;

  if (!token) {
    throw new Error("Missing WEBFLOW_TOKEN env variable");
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Webflow Error:", data);
    throw new Error("Webflow API error");
  }

  return data;
}


// ------------------------------------------------------
// Create new Webflow Item
// ------------------------------------------------------
async function createItem(mapped) {
  const collectionId = process.env.WEBFLOW_COLLECTION;

  const url = `https://api.webflow.com/v2/collections/${collectionId}/items`;

  const body = {
    isArchived: false,
    isDraft: false,
    fieldData: {
      name: mapped.name,
      slug: mapped.slug,

      hersteller: mapped.hersteller,
      serie: mapped.serie,
      modell: mapped.modell,
      modell_zusatz: mapped.modell_zusatz,

      zustand: mapped.zustand,
      fahrzeugart: mapped.fahrzeugart,
      fahrzeugtyp: mapped.fahrzeugtyp,

      ps: mapped.ps ?? "",
      kw: mapped.kw ?? "",
      kraftstoff: mapped.kraftstoff,
      getriebe: mapped.getriebe,

      beschreibung: mapped.beschreibung,
      beschreibung_kurz: mapped.beschreibung_kurz,

      kilometer: mapped.kilometer,
      baujahr: mapped.baujahr,
      preis: mapped.preis,

      breite: mapped.breite,
      hoehe: mapped.hoehe,
      laenge: mapped.laenge,

      geraet_id: mapped.geraet_id,

      hauptbild: mapped.hauptbild,
      galerie: mapped.galerie,

      verkauf_miete: mapped.verkauf_miete
    }
  };

  return webflowRequest("POST", url, body);
}


// ------------------------------------------------------
// Update existing Webflow Item
// ------------------------------------------------------
async function updateItem(itemId, mapped) {
  const collectionId = process.env.WEBFLOW_COLLECTION;
  const url = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`;

  const body = {
    isArchived: false,
    isDraft: false,
    fieldData: {
      name: mapped.name,
      slug: mapped.slug,

      hersteller: mapped.hersteller,
      serie: mapped.serie,
      modell: mapped.modell,
      modell_zusatz: mapped.modell_zusatz,

      zustand: mapped.zustand,
      fahrzeugart: mapped.fahrzeugart,
      fahrzeugtyp: mapped.fahrzeugtyp,

      ps: mapped.ps ?? "",
      kw: mapped.kw ?? "",
      kraftstoff: mapped.kraftstoff,
      getriebe: mapped.getriebe,

      beschreibung: mapped.beschreibung,
      beschreibung_kurz: mapped.beschreibung_kurz,

      kilometer: mapped.kilometer,
      baujahr: mapped.baujahr,
      preis: mapped.preis,

      breite: mapped.breite,
      hoehe: mapped.hoehe,
      laenge: mapped.laenge,

      geraet_id: mapped.geraet_id,

      hauptbild: mapped.hauptbild,
      galerie: mapped.galerie,

      verkauf_miete: mapped.verkauf_miete
    }
  };

  return webflowRequest("PATCH", url, body);
}


// ------------------------------------------------------
// Fetch all existing Webflow items
// ------------------------------------------------------
async function getExistingWebflowItems() {
  const collectionId = process.env.WEBFLOW_COLLECTION;
  const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=1000`;

  const data = await webflowRequest("GET", url);
  return data.items || [];
}


// ------------------------------------------------------
// DELTA SYNC LOGIC
// ------------------------------------------------------
export async function runDeltaSync(syscaraData) {
  console.log("🚀 Starting Delta Sync…");

  const syscaraList = Object.values(syscaraData);
  console.log(`📦 ${syscaraList.length} Fahrzeuge von Syscara erhalten`);

  // Load Webflow items
  const existingItems = await getExistingWebflowItems();
  console.log(`📚 ${existingItems.length} bestehende Webflow-Einträge geladen`);

  const existingById = {};
  for (const item of existingItems) {
    if (item.fieldData?.geraet_id) {
      existingById[item.fieldData.geraet_id] = item;
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // LOOP THROUGH SYSCARA VEHICLES
  for (const vehicle of syscaraList) {
    try {
      const mapped = mapVehicle(vehicle);

      if (!mapped) {
        console.warn(`⚠ Fahrzeug ${vehicle?.id} übersprungen (Mapping fehlgeschlagen)`);
        skipped++;
        continue;
      }

      const existingItem = existingById[mapped.geraet_id];

      if (!existingItem) {
        await createItem(mapped);
        console.log(`➕ Created: ${mapped.name}`);
        created++;
        continue;
      }

      await updateItem(existingItem.id, mapped);
      console.log(`♻️ Updated: ${mapped.name}`);
      updated++;

    } catch (err) {
      console.error(`❌ Fehler bei Fahrzeug ${vehicle?.id}:`, err.message);
      skipped++;
      continue;
    }
  }

  console.log("🎉 Delta Sync abgeschlossen!");
  console.log(`➕ Neu: ${created}`);
  console.log(`♻️ Aktualisiert: ${updated}`);
  console.log(`⚠ Übersprungen: ${skipped}`);

  return { created, updated, skipped };
}

