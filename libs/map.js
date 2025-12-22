// libs/map.js
function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function mapVehicle(ad) {
  const vehicleId = ad?.id ? String(ad.id) : "";

  const producer = ad.model?.producer || "";
  const series = ad.model?.series || "";
  const model = ad.model?.model || "";
  const modelAdd = ad.model?.model_add || "";

  const name =
    [producer, series, model].filter(Boolean).join(" ") ||
    `Fahrzeug ${vehicleId || "unbekannt"}`;

  const slug = vehicleId
    ? `${vehicleId}-${slugify(name)}`
    : slugify(name);

  /* -----------------------------
     Bettarten → SLUGS
     (robust: Array ODER String)
  ----------------------------- */
  let rawBeds = [];

  if (Array.isArray(ad.beds?.beds)) {
    rawBeds = ad.beds.beds.map((b) => b?.type);
  } else if (typeof ad.beds?.beds === "string") {
    rawBeds = ad.beds.beds.split(",");
  }

  const bettartenSlugs = rawBeds
    .map((b) => String(b || "").trim())
    .filter(Boolean)
    .map((b) => slugify(b));

  /* -----------------------------
     Features → SLUGS (unverändert)
  ----------------------------- */
  const features = Array.isArray(ad.features) ? ad.features : [];
  const featureSlugs = features.map((f) =>
    slugify(String(f))
  );

  /* -----------------------------
     Media Cache (UNVERÄNDERT)
  ----------------------------- */
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

  return {
    name,
    slug,
    "fahrzeug-id": vehicleId,

    hersteller: producer,
    serie: series,
    modell: model,
    "modell-zusatz": modelAdd,

    zustand: ad.condition || "",
    fahrzeugart: ad.type || "",
    fahrzeugtyp: ad.typeof || "",

    baujahr: ad.model?.modelyear
      ? String(ad.model.modelyear)
      : "",
    kilometer:
      ad.mileage != null && ad.mileage !== 0
        ? String(ad.mileage)
        : "",
    preis:
      ad.prices?.offer != null
        ? String(ad.prices.offer)
        : "",

    ps: ad.engine?.ps != null ? String(ad.engine.ps) : "",
    kw: ad.engine?.kw != null ? String(ad.engine.kw) : "",
    kraftstoff: ad.engine?.fuel || "",
    getriebe: ad.engine?.gear || "",

    beschreibung:
      ad.texts?.description || ad.description || "",

    "verkauf-miete":
      ad.category === "Rent" ? "miete" : "verkauf",

    featureSlugs,
    bettartenSlugs,

    "media-cache": mediaCache,
  };
}


