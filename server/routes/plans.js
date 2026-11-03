/**
 * routes/plans.js
 * Endpoints for retrieving and editing saved Plan snapshots.
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Plan = require("../models/Plan");
const Trip = require("../models/Trip");
const PackingList = require("../models/PackingList");
const Expense = require("../models/Expense");
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

// POST /api/plans/:id/convert-to-trip - Convert plan into PackGo Trip, PackingList and Expenses
router.post("/:id/convert-to-trip", async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.header("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.header("x-auth-token");

    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.user?.id || decoded.user?._id;
      } catch (_e) {
        // Token verification failed
      }
    }

    if (!userId) {
      return res.status(401).json({
        error: {
          code: "AUTH_REQUIRED",
          message: "Please log in to save this trip to your journeys.",
        },
      });
    }

    let plan = null;
    if (mongoose.connection.readyState === 1) {
      plan = await Plan.findById(req.params.id);
    }
    if (!plan) {
      plan = inMemoryJobs.get(`plan:${req.params.id}`);
    }

    if (!plan) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Plan not found." },
      });
    }

    const startDate = plan.request.startDate
      ? new Date(plan.request.startDate)
      : new Date();
    const durationDays = plan.days?.length || plan.request.days || 3;
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const activities = [];
    (plan.days || []).forEach((d) => {
      const dayDate = new Date(
        startDate.getTime() + (d.day - 1) * 24 * 60 * 60 * 1000,
      );
      (d.items || []).forEach((item) => {
        const place = (plan.places && plan.places[item.placeId]) || {};
        activities.push({
          name: place.name || "Activity",
          date: dayDate,
          location:
            place.address ||
            (place.lat
              ? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
              : plan.request.destination),
          notes: `${(item.slot || "slot").toUpperCase()} • ${place.category || "activity"} • Est. cost: ₹${place.estCost || 0}`,
        });
      });
    });

    const totalBudget = plan.budget
      ? (plan.budget.stay || 0) +
        (plan.budget.food || 0) +
        (plan.budget.transport || 0) +
        (plan.budget.activities || 0) +
        (plan.budget.buffer || 0)
      : plan.request.budget || 0;

    const trip = await Trip.create({
      user: userId,
      destination: plan.request.destination,
      startDate,
      endDate,
      budget: totalBudget,
      description: `Generated AI Trip Plan for ${plan.request.destination} (${durationDays} days)`,
      status: "planned",
      activities,
    });

    // Populate packing list if present
    if (Array.isArray(plan.packing) && plan.packing.length > 0) {
      const categoryMap = (reason = "") => {
        const r = reason.toLowerCase();
        if (
          r.includes("cloth") ||
          r.includes("wear") ||
          r.includes("jacket") ||
          r.includes("rain") ||
          r.includes("warm") ||
          r.includes("towel")
        )
          return "Clothing";
        if (
          r.includes("toilet") ||
          r.includes("hygiene") ||
          r.includes("sunscreen") ||
          r.includes("brush")
        )
          return "Toiletries";
        if (
          r.includes("charge") ||
          r.includes("adapter") ||
          r.includes("phone") ||
          r.includes("camera") ||
          r.includes("electronic")
        )
          return "Electronics";
        if (
          r.includes("pass") ||
          r.includes("id") ||
          r.includes("ticket") ||
          r.includes("doc")
        )
          return "Documents";
        if (r.includes("med") || r.includes("pill") || r.includes("first aid"))
          return "Medicine";
        return "Other";
      };

      await PackingList.create({
        trip: trip._id,
        user: userId,
        items: plan.packing.map((p) => ({
          name: p.item,
          category: categoryMap(p.reason),
          packed: false,
        })),
      });
    }

    // Populate initial estimated expenses
    if (plan.budget) {
      const budgetItems = [
        {
          category: "Accommodation",
          amount: plan.budget.stay,
          desc: "Estimated Stay / Accommodation",
        },
        {
          category: "Food",
          amount: plan.budget.food,
          desc: "Estimated Dining & Street Food",
        },
        {
          category: "Transportation",
          amount: plan.budget.transport,
          desc: "Estimated Local Transport & Travel",
        },
        {
          category: "Activities",
          amount: plan.budget.activities,
          desc: "Estimated Entry Tickets & Activities",
        },
      ];
      for (const b of budgetItems) {
        if (b.amount > 0) {
          await Expense.create({
            user: userId,
            trip: trip._id,
            amount: b.amount,
            currency: plan.request.currency || "INR",
            category: b.category,
            description: b.desc,
            date: startDate,
          });
        }
      }
    }

    if (plan.save) {
      plan.tripId = trip._id;
      await plan.save();
    }

    return res.status(201).json({
      success: true,
      tripId: trip._id,
      message: "Plan successfully converted and synced to Journey!",
    });
  } catch (err) {
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: err.message || "Failed to convert plan to trip.",
      },
    });
  }
});

module.exports = router;
