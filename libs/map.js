// libs/map.js

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// --------------------------------------------------
// 🔑 WICHTIG: Syscara-Antwort normalisieren
// --------------------------------------------------
function normalizeSyscaraAd(input) {
  if (!input || typeof input !== "object") return {};

  // Variante C: { RESULT, DATA: { "135965": {...} } }
  if (input.DATA && typeof input.DATA === "object") {
    const keys = Object.keys(input.DATA);
    if (keys.length === 1) {
      return input.DATA[keys[0]];
    }
  }

  // Variante B: { "135965": {...} }
  if (!input.id) {
    const keys = Object.keys(input);
    if (keys.length === 1 && typeof input[keys[0]] === "object") {
      return input[keys[0]];
    }
  }

  // Variante A: direktes Fahrzeug
  return input;
}

// --------------------------------------------------
export function mapVehicle(rawAd) {
  // 🔹 1) NORMALISIEREN (DAS WAR DER FEHLER)
  const ad = normalizeSyscaraAd(rawAd);

  const vehicleId = ad?.id ? String(ad.id) : "";

  // ------------------------------------------------
  // 2) Name & Slug
  // ------------------------------------------------
  const producer = ad.model?.producer || "";
  const series = ad.model?.series || "";
  const model = ad.model?.model || "";

  const baseName =
    [producer, series, model].filter(Boolean).join(" ") ||
    `Fahrzeug ${vehicleId || "unbekannt"}`;

  const slug = vehicleId
    ? `${vehicleId}-${slugify(baseName)}`
    : slugify(baseName);

  // ------------------------------------------------
  // 3) Verkaufsart
  // ------------------------------------------------
  const verkaufMiete = ad.category === "Rent" ? "miete" : "verkauf";

  // ------------------------------------------------
  // 4) Zusatzdaten
  // ------------------------------------------------
  const gesamtmasse =
    ad.weights?.total != null ? String(ad.weights.total) : "";

  const erstzulassung = ad.date?.registration || "";

  const schlafplatz =
    ad.beds?.num != null ? String(ad.beds.num) : "";

  const bett = Array.isArray(ad.beds?.beds)
    ? ad.beds.beds.map((b) => b.type).join(", ")
    : "";

  const sitzgruppe = Array.isArray(ad.seating?.seatings)
    ? ad.seating.seatings.map((s) => s.type).join(", ")
    : "";

  // ------------------------------------------------
  // 5) Media-IDs (Cache)
  // ------------------------------------------------
  const media = Array.isArray(ad.media) ? ad.media : [];

  const images = media.filter(
    (m) => m && m.group === "image" && m.id
  );

  const grundriss =
    media.find((m) => m && m.group === "layout")?.id || null;

  const mediaCache = JSON.stringify({
    hauptbild: images[0]?.id || null,
    galerie: images.map((m) => m.id),
    grundriss,
  });

  // ------------------------------------------------
  // 6) Rückgabe
  // ------------------------------------------------
  return {
    name: baseName,
    slug,
    "fahrzeug-id": vehicleId,

    "verkauf-miete": verkaufMiete,
    gesamtmasse,
    erstzulassung,
    schlafplatz,
    bett,
    sitzgruppe,

    "media-cache": mediaCache,
  };
}

