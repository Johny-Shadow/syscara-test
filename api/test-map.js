import { mapVehicle } from "../libs/map.js";

export default async function handler(req, res) {
  try {
    const user = process.env.SYS_API_USER;
    const pass = process.env.SYS_API_PASS;

    const url = "https://api.syscara.com/sale/ads/135965";

    const response = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    const ad = await response.json();

    const mapped = mapVehicle(ad);

    return res.status(200).json({
      original: ad,
      mapped,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
