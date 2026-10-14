const axios = require("axios");

// This controller does NOT hardcode or guess visa rules — visa requirements
// change often and are legally consequential, so fabricating them would be
// actively harmful. It calls a real visa-data API if VISA_API_KEY is
// configured; otherwise it returns a clear "not configured" response with a
// link to an official source, rather than silently returning nothing or
// making something up.
//
// To go live: sign up for a visa-requirements API (e.g. Sherpa, VisaList,
// Travel-Advisory-API) and set VISA_API_KEY + VISA_API_URL in .env, then
// adjust the request/response mapping below to match that provider's schema.

const OFFICIAL_LOOKUP_URL = (destinationCountryCode) =>
  `https://www.google.com/search?q=visa+requirements+for+${encodeURIComponent(
    destinationCountryCode || "",
  )}+site:gov`;

exports.checkVisaRequirement = async (req, res, _next) => {
  try {
    const { nationality, destinationCountryCode } = req.query;

    if (!nationality || !destinationCountryCode) {
      return res.status(400).json({
        msg: "nationality and destinationCountryCode query params are required",
      });
    }

    if (!process.env.VISA_API_KEY || !process.env.VISA_API_URL) {
      return res.json({
        success: true,
        configured: false,
        nationality,
        destinationCountryCode,
        msg:
          "Live visa-requirement data isn't configured on this server yet " +
          "(VISA_API_KEY / VISA_API_URL missing). Showing an official lookup " +
          "link instead of guessing — visa rules are too consequential to " +
          "get wrong.",
        officialLookupUrl: OFFICIAL_LOOKUP_URL(destinationCountryCode),
      });
    }

    // Example shape for a generic provider — adjust to match whichever API
    // you sign up for; response fields will differ by provider.
    const { data } = await axios.get(process.env.VISA_API_URL, {
      params: { passport: nationality, destination: destinationCountryCode },
      headers: { Authorization: `Bearer ${process.env.VISA_API_KEY}` },
      timeout: 10000,
    });

    res.json({
      success: true,
      configured: true,
      nationality,
      destinationCountryCode,
      ...data,
      disclaimer:
        "Verify against the destination country's official embassy/consulate " +
        "site before booking — requirements can change without notice.",
    });
  } catch (err) {
    // Network/provider failure: don't fail silently or fabricate a result —
    // fall back to the official-source link so the user isn't stuck.
    console.error("[visa] Provider request failed:", err.message);
    res.json({
      success: true,
      configured: true,
      providerError: true,
      msg: "The visa-data provider could not be reached. Please check the official source below.",
      officialLookupUrl: OFFICIAL_LOOKUP_URL(req.query.destinationCountryCode),
    });
  }
};
