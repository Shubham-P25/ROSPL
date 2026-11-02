const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");
const auth = require("../middleware/auth");

// @route   GET api/weather/trip/:tripId
// @desc    Get weather tailored to a specific trip's dates and destination
// @access  Private
router.get("/trip/:tripId", auth, weatherController.getTripWeather);

// @route   GET api/weather/current/:location
// @desc    Get current weather for a location (legacy compatibility)
// @access  Private
router.get("/current/:location", auth, weatherController.getCurrentWeather);

// @route   GET api/weather/forecast/:location
// @desc    Get 5-day forecast for a location (legacy compatibility)
// @access  Private
router.get("/forecast/:location", auth, weatherController.getForecast);

module.exports = router;
