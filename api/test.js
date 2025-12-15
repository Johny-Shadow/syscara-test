export default async function handler(req, res) {
  try {
    const auth = Buffer
      .from(`${process.env.SYS_API_USER}:${process.env.SYS_API_PASS}`)
      .toString("base64");

    const response = await fetch("https://api.syscara.com/sale/vehicles/", {
      headers: {
        "Authorization": `Basic ${auth}`
      }
    });

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}
