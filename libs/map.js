// libs/map.js

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Umlaute entfernen
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function mapVehicle(ad) {
  // ----------------------------------------------------
  // 1) Falls Syscara das Fahrzeug als { "135965": { ... }} liefert,
  //    ziehen wir zuerst das innere Objekt raus.
  // ----------------------------------------------------
  let vehicleId = null;

  if (typeof ad === "object" && ad !== null && !ad.id) {
    const keys = Object.keys(ad);
    if (keys.length > 0) {
      vehicleId = keys[0];
      ad = ad[vehicleId];
    }
  } else {
    vehicleId = ad.id;
  }

  vehicleId = vehicleId ? String(vehicleId) : "";

  // ----------------------------------------------------
  // 2) Grunddaten / Name / Slug
  // ----------------------------------------------------
  const producer = ad.model?.producer || "";
  const series = ad.model?.series || "";
  const model = ad.model?.model || "";
  const model_add = ad.model?.model_add || "";

  // Name OHNE model_add (damit die ID der "Unterscheider" ist)
  const baseNameParts = [producer, series, model].filter(Boolean);
  const baseName =
    baseNameParts.join(" ").trim() || `Fahrzeug ${vehicleId || "unbekannt"}`;

  const slugBase = slugify(baseName);
  const slug = vehicleId ? `${vehicleId}-${slugBase}` : slugBase;

  // ----------------------------------------------------
  // 3) Weitere Felder (einfach Strings draus machen)
  // ----------------------------------------------------
  const fahrzeugart = ad.type || "";
  const fahrzeugtyp = ad.typeof || "";
  const zustand = ad.condition || "";

  const baujahr = ad.model?.modelyear
    ? String(ad.model.modelyear)
    : "";

  const kilometer = ad.mileage != null && ad.mileage !== 0
    ? String(ad.mileage)
    : "";

  const preis = ad.prices?.offer != null
    ? String(ad.prices.offer)
    : "";

  const breite = ad.dimensions?.width != null
    ? String(ad.dimensions.width)
    : "";

  const hoehe = ad.dimensions?.height != null
    ? String(ad.dimensions.height)
    : "";

  const laenge = ad.dimensions?.length != null
    ? String(ad.dimensions.length)
    : "";

  // ----------------------------------------------------
  // 4) MEDIA-IDS SAMMELN & media-cache bauen (Version A)
  //    → wir speichern NUR IDs, keine URLs!
  // ----------------------------------------------------
  const media = Array.isArray(ad.media) ? ad.media : [];

  // Nur echte Bilder (group === "image")
  const imageIds = media
    .filter((m) => m && m.group === "image" && m.id != null)
    .map((m) => m.id);

  const mainImageId = imageIds.length > 0 ? imageIds[0] : null;

  const mediaCacheObject = {
    hauptbild: mainImageId,
    galerie: imageIds,
  };

  const mediaCacheJson = JSON.stringify(mediaCacheObject);

  // ----------------------------------------------------
  // 5) Mapping für Webflow zurückgeben
  //    Bilderfelder lassen wir VORERST LEER / UNBENUTZT,
  //    bis wir saubere öffentliche URLs / Proxy haben.
  // ----------------------------------------------------
  return {
    name: baseName,
    slug,
    "fahrzeug-id": vehicleId,

    hersteller: producer,
    serie: series,
    modell: model,
    "modell-zusatz": model_add,

    fahrzeugart,
    fahrzeugtyp,
    zustand,
    baujahr,
    kilometer,
    preis,
    breite,
    hoehe,
    laenge,

    // Nur Cache-Feld – hier liegen die Syscara-IDs drin:
    "media-cache": mediaCacheJson,

    // WICHTIG:
    // hauptbild & galerie NICHT setzen, damit Webflow
    // keine kaputten Remote-URLs laden will.
    // Wenn wir später einen Bild-Proxy gebaut haben,
    // füllen wir diese Felder auf Basis von media-cache.
    // hauptbild: null,
    // galerie: [],
  };
}

