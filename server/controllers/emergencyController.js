const {
  EMERGENCY_NUMBERS,
  GENERIC_FALLBACK,
  resolveCountryCodeFromDestination,
} = require("../data/emergencyNumbers");

// @route   GET /api/emergency/:countryCode
// @desc    Get emergency numbers (police/ambulance/fire/etc.) for a country
// @access  Public — this is safety-critical info; don't gate it behind auth
exports.getEmergencyNumbers = async (req, res, next) => {
  try {
    const { countryCode } = req.params;

    if (!countryCode || typeof countryCode !== "string") {
      return res.status(400).json({ msg: "countryCode is required" });
    }

    const code = countryCode.trim().toUpperCase();
    const entry = EMERGENCY_NUMBERS[code];

    if (!entry) {
      return res.json({
        success: true,
        countryCode: code,
        ...GENERIC_FALLBACK,
        verified: false,
      });
    }

    res.json({
      success: true,
      countryCode: code,
      ...entry,
      verified: true,
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/emergency/by-destination/:destination
// @desc    Best-effort resolve a trip's free-text destination to emergency numbers
// @access  Public
// NOTE: uses simple keyword matching, not real geocoding. Returns
// resolvedBy: "keyword-match" so the frontend can show a "verify this"
// disclaimer rather than presenting it as authoritative.
exports.getByDestination = async (req, res, next) => {
  try {
    const { destination } = req.params;
    const code = resolveCountryCodeFromDestination(destination);

    if (!code) {
      return res.json({
        success: true,
        countryCode: null,
        ...GENERIC_FALLBACK,
        resolvedBy: "no-match",
      });
    }

    const entry = EMERGENCY_NUMBERS[code];
    res.json({
      success: true,
      countryCode: code,
      ...entry,
      verified: true,
      resolvedBy: "keyword-match",
    });
  } catch (err) {
    next(err);
  }
};

exports.listAvailableCountries = async (req, res, next) => {
  try {
    const countries = Object.entries(EMERGENCY_NUMBERS).map(([code, data]) => ({
      countryCode: code,
      country: data.country,
    }));
    res.json({ success: true, countries });
  } catch (err) {
    next(err);
  }
};
