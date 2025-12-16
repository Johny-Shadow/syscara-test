// libs/map.js

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function hasFeature(features, key) {
  return Array.isArray(features) && features.includes(key) ? "true" : "";
}

export function mapVehicle(ad) {
  // -------------------------------
  // 1) Fahrzeug normalisieren
  // -------------------------------
  let vehicleId = ad?.id ? String(ad.id) : "";

  // -------------------------------
  // 2) Name & Slug
  // -------------------------------
  const producer = ad.model?.producer || "";
  const series = ad.model?.series || "";
  const model = ad.model?.model || "";

  const baseName =
    [producer, series, model].filter(Boolean).join(" ") ||
    `Fahrzeug ${vehicleId || "unbekannt"}`;

  const slug = vehicleId
    ? `${vehicleId}-${slugify(baseName)}`
    : slugify(baseName);

  // -------------------------------
  // 3) Basisdaten
  // -------------------------------
  const verkaufMiete = ad.category === "Rent" ? "miete" : "verkauf";

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

  // -------------------------------
  // 4) Media-IDs sammeln
  // -------------------------------
  const media = Array.isArray(ad.media) ? ad.media : [];

  const images = media.filter(
    (m) => m && m.group === "image" && m.id
  );

  const grundriss = media.find(
    (m) => m && m.group === "layout"
  )?.id || null;

  const mediaCache = JSON.stringify({
    hauptbild: images[0]?.id || null,
    galerie: images.map((m) => m.id),
    grundriss,
  });

  // -------------------------------
  // 5) Rückgabe
  // -------------------------------
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
