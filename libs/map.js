export function mapVehicle(vehicle) {
  try {
    if (!vehicle || typeof vehicle !== "object") {
      console.warn("⛔ Invalid vehicle object:", vehicle);
      return null; // skip this vehicle
    }

    const producer = vehicle.model?.producer ?? "";
    const series = vehicle.model?.series ?? "";
    const model = vehicle.model?.model ?? "";

    const fullName = [producer, series, model].filter(Boolean).join(" ");

    return {
      name: fullName || "Unbenanntes Fahrzeug",
      slug: `${producer}-${series}-${model}-${vehicle.id}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),

      hersteller: producer,
      serie: series,
      modell: model,
      modell_zusatz: vehicle.model?.model_add ?? "",

      zustand: vehicle.condition ?? "",
      fahrzeugart: vehicle.type ?? "",
      fahrzeugtyp: vehicle.typeof ?? "",

      ps: String(vehicle.engine?.ps ?? ""),
      kw: String(vehicle.engine?.kw ?? ""),

      kraftstoff: vehicle.engine?.fuel ?? "",
      getriebe: vehicle.engine?.gear ?? "",

      beschreibung: vehicle.texts?.description ?? "",
      beschreibung_kurz: vehicle.texts?.description_plain ?? "",

      kilometer: String(vehicle.mileage ?? ""),
      baujahr: String(vehicle.model?.modelyear ?? ""),

      preis: String(vehicle.prices?.offer ?? ""),

      breite: String(vehicle.dimensions?.width ?? ""),
      hoehe: String(vehicle.dimensions?.height ?? ""),
      laenge: String(vehicle.dimensions?.length ?? ""),

      geraet_id: String(vehicle.id ?? ""),

      hauptbild: vehicle.media?.[0]?.id ?? "",
      galerie: (vehicle.media ?? [])
        .filter((m) => m.group === "image")
        .map((m) => m.id)
        .slice(0, 25),

      verkauf_miete: vehicle.flags?.includes("RENTAL_CAR") ? "Miete" : "Kauf",
    };
  } catch (err) {
    console.error("❌ Mapping failed for vehicle:", vehicle?.id, err);
    return null;
  }
}
