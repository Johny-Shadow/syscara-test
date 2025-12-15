/**
 * Mapping Syscara → Webflow CMS fields
 */

export function mapVehicle(sys) {
  try {
    const id = sys.id;
    const model = sys.model || {};
    const engine = sys.engine || {};
    const dims = sys.dimensions || {};
    const prices = sys.prices || {};
    const media = sys.media || [];

    // Name: Hersteller + Serie + Modell
    const name = `${model.producer || ""} ${model.series || ""} ${model.model || ""}`.trim();

    // Slug: sauber + fallback auf ID
    const slug = `${model.producer || "fahrzeug"}-${model.model || ""}-${id}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");

    // Fahrzeugart (Caravan oder Reisemobil)
    const fahrzeugart =
      sys.type === "Caravan" ? "Caravan" :
      sys.type === "Reisemobil" ? "Reisemobil" :
      sys.type || "";

    // Zustand
    const zustand = {
      NEW: "Neu",
      USED: "Gebraucht",
      BE: "Gebraucht",
    }[sys.condition] || sys.condition || "";

    // Typ (z. B. Teilintegriert)
    const fahrzeugtyp = sys.typeof || "";

    // Bilder vorbereiten
    const imageIds = media
      .filter((m) => m.group === "image" && m.type === "upload")
      .map((m) => m.id);

    const hauptbild = imageIds.length > 0 ? imageIds[0] : "";

    const galerie = imageIds.slice(0, 25);

    // Kilometerstand
    const km = sys.mileage || "";

    // Baujahr
    const baujahr = model.modelyear || "";

    // Preis (Brutto)
    const preis = prices.offer || prices.basic || "";

    // Maße
    const breite = dims.width || "";
    const hoehe = dims.height || "";
    const laenge = dims.length || "";

    // Beschreibung
    const beschreibung = sys.texts?.description || "";
    const beschreibung_kurz = sys.texts?.description_plain || "";

    return {
      originalId: id, // wichtig für Delta-Sync
      mapped: {
        name,
        slug,
        hersteller: model.producer || "",
        serie: model.series || "",
        modell: model.model || "",
        modell_zusatz: model.model_add || "",
        zustand,
        fahrzeugart,
        fahrzeugtyp,
        ps: engine.ps || "",
        kw: engine.kw || "",
        kraftstoff: engine.fuel || "",
        getriebe: engine.gear || "",
        beschreibung,
        beschreibung_kurz,
        kilometer: km,
        baujahr,
        preis,
        breite,
        hoehe,
        laenge,
        geraet_id: String(id),
        hauptbild,
        galerie
      }
    };

  } catch (err) {
    console.error("Mapping Error:", err);
    return null;
  }
}
