const express = require("express");
const router = express.Router();
const {
  getEmergencyNumbers,
  getByDestination,
  listAvailableCountries,
} = require("../controllers/emergencyController");

// @route   GET api/emergency
// @desc    List countries with known emergency numbers
// @access  Public
router.get("/", listAvailableCountries);

// @route   GET api/emergency/by-destination/:destination
// @desc    Best-effort lookup from a trip's free-text destination string
// @access  Public
// IMPORTANT: must be registered before the /:countryCode route below,
// otherwise Express would treat "by-destination" as a country code.
router.get("/by-destination/:destination", getByDestination);

// @route   GET api/emergency/:countryCode
// @desc    Get emergency numbers for a specific country (ISO alpha-2, e.g. "IN")
// @access  Public
router.get("/:countryCode", getEmergencyNumbers);

module.exports = router;
