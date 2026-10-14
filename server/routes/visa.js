const express = require("express");
const router = express.Router();
const { checkVisaRequirement } = require("../controllers/visaController");
const auth = require("../middleware/auth");

// @route   GET api/visa/check?nationality=IN&destinationCountryCode=FR
// @desc    Check visa requirement between two countries (or return official
//          lookup link if no live provider is configured)
// @access  Private — behind auth like the rest of the trip-planning routes
router.get("/check", auth, checkVisaRequirement);

module.exports = router;
