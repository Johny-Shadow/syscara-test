// api/ads.js

export default async function handler(req, res) {
  try {
    const auth = Buffer.from(
      `${process.env.SYS_API_USER}:${process.env.SYS_API_PASS}`
    ).toString("base64");

    const response = await fetch("https://api.syscara.com/sale/ads/", {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(500).json({
        error: "Syscara returned an error",
        status: response.status,
        message: text,
      });
    }

    // Versuchen, JSON zu parsen
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON from Syscara",
        raw: text,
      });
    }

    return res.status(200).json({
      count: Object.keys(data).length,
      ads: data,
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
