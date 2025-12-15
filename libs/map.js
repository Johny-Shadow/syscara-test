// libs/map.js

//
// Hilfsfunktion: Slug erzeugen
//
function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Umlaute entfernen
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

//
// Hauptfunktion: Syscara → Webflow Mapping
//
export function mapVehicle(ad) {

  // ----------------------------------------------------
  // 1) Syscara liefert manchmal: { "135965": { ... } }
  // ----------------------------------------------------
  if (typeof ad === "object" && !ad.id) {
    const key = Object.keys(ad)[0];
    ad = ad[key];
  }

  const id = ad.id ? String(ad.id) : "";

  // ----------------------------------------------------
  // 2) Modelldaten sauber extrahieren
  // ----------------------------------------------------
  const producer = ad.model?.producer || "";
  const series   = ad.model?.series || "";
  const model    = ad.model?.model || "";
  const modelAdd = ad.model?.model_add || "";

  const nameParts = [producer, series, model].filter(Boolean);
  const name = nameParts.join(" ").trim();

  // Wenn Name leer → Fallback
  const finalName = name || `Fahrzeug ${id || "unbekannt"}`;

  // ----------------------------------------------------
  // 3) Slug generieren
  // ----------------------------------------------------
  const slug = id
    ? `${id}-${slugify(finalName)}`
    : slugify(finalName);

  // ----------------------------------------------------
  // 4) Hauptbild + Galerie
  // ----------------------------------------------------
  const images = Array.isArray(ad.media)
    ? ad.media.filter(m => m.group === "image" && m.id)
    : [];

  // URL-Format Syscara:
  // https://api.syscara.com/media/<ID>
  const imageUrl = imgId =>
    `https://api.syscara.com/media/${imgId}`;

  const hauptbild = images[0] ? imageUrl(images[0].id) : "";

  const galerie = images.slice(0, 25).map(m => imageUrl(m.id));

  // ----------------------------------------------------
  // 5) Rückgabe der Webflow-kompatiblen Struktur
  // ----------------------------------------------------
  return {
    // Pflichtfelder
    name: finalName,
    slug,

    // Deine Webflow-Felder
    "fahrzeug-id": id,
    hersteller: producer,
    serie: series,
    modell: model,
    "modell-zusatz": modelAdd,

    fahrzeugart: ad.type || "",
    fahrzeugtyp: ad.typeof || "",
    zustand: ad.condition || "",

    baujahr: ad.model?.modelyear
      ? String(ad.model.modelyear)
      : "",

    kilometer: ad.mileage
      ? String(ad.mileage)
      : "",

    preis: ad.prices?.offer
      ? String(ad.prices.offer)
      : "",

    breite: ad.dimensions?.width
      ? String(ad.dimensions.width)
      : "",

    hoehe: ad.dimensions?.height
      ? String(ad.dimensions.height)
      : "",

    laenge: ad.dimensions?.length
      ? String(ad.dimensions.length)
      : "",

    hauptbild,
    galerie
  };
}

