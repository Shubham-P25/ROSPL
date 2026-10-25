/**
 * routes/plans.js
 * Endpoints for retrieving and editing saved Plan snapshots.
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const { inMemoryJobs } = require("../jobs/runner");
const { orderDay } = require("../planner/order");
const { assignTimeSlots } = require("../planner/slots");

// GET /api/plans/:id - Get saved plan snapshot
router.get("/:id", async (req, res) => {
  try {
    let plan = null;
    if (mongoose.connection.readyState === 1) {
      plan = await Plan.findById(req.params.id).lean();
    }
    if (!plan) {
      plan = inMemoryJobs.get(`plan:${req.params.id}`);
    }

    if (!plan) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Travel plan snapshot not found.",
        },
      });
    }

    return res.json(plan);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to retrieve plan snapshot.",
      },
    });
  }
});

// PATCH /api/plans/:id - User edits (reorder, remove, add place)
router.patch("/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: {
          code: "UNAVAILABLE",
          message: "Database connection required for persistent edits.",
        },
      });
    }

    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Plan not found." },
      });
    }

    const { days, places } = req.body;
    if (days) plan.days = days;
    if (places) plan.places = { ...plan.places, ...places };
    plan.revision = (plan.revision || 1) + 1;

    await plan.save();
    return res.json(plan);
  } catch (_err) {
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update plan." },
    });
  }
});

// POST /api/plans/:id/days/:n/regenerate - Regenerate a single day
router.post("/:id/days/:n/regenerate", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: {
          code: "UNAVAILABLE",
          message: "Database connection required to regenerate plan.",
        },
      });
    }

    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Plan not found." },
      });
    }

    const dayNumber = parseInt(req.params.n, 10);
    const dayObj = plan.days.find((d) => d.day === dayNumber);
    if (!dayObj) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Day ${dayNumber} not found in this plan.`,
        },
      });
    }

    // Re-order and re-slot using the stored places snapshot (deterministic, no external API)
    const dayPlaces = dayObj.items
      .map((item) => plan.places[item.placeId])
      .filter(Boolean);

    const reordered = orderDay(dayPlaces);
    const reslotted = assignTimeSlots(reordered);

    dayObj.items = reslotted;
    dayObj.estCost = reordered.reduce((s, p) => s + (p.estCost || 0), 0);
    plan.revision = (plan.revision || 1) + 1;

    plan.markModified("days");
    await plan.save();

    return res.json({
      success: true,
      day: dayObj,
      revision: plan.revision,
    });
  } catch (_err) {
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to regenerate day." },
    });
  }
});

module.exports = router;
