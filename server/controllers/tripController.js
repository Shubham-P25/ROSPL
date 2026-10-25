const crypto = require("crypto");
const Trip = require("../models/Trip");
const Destination = require("../models/Destination");
const Expense = require("../models/Expense");
const PackingList = require("../models/PackingList");
const Plan = require("../models/Plan");
const { generatePlan } = require("../planner/index");
const { getSeedPlaces, normalizeCityName } = require("../seed/index");
const { withFallback } = require("../lib/withFallback");
const nominatim = require("../providers/nominatim");
const opentripmap = require("../providers/opentripmap");
const openmeteo = require("../providers/openmeteo");
const wikivoyage = require("../providers/wikivoyage");
const wikimedia = require("../providers/wikimedia");

const SEED_COORDINATES = {
  jaipur: { lat: 26.9124, lng: 75.7872, name: "Jaipur" },
  goa: { lat: 15.2993, lng: 74.124, name: "Goa" },
  varanasi: { lat: 25.3176, lng: 82.9739, name: "Varanasi" },
};

/**
 * Escape special regex metacharacters in a string so it can be safely
 * interpolated into a RegExp without altering the intended pattern.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create new trip
exports.createTrip = async (req, res) => {
  try {
    const {
      destination,
      startDate,
      endDate,
      description,
      budget,
      status,
      activities,
      accommodation,
      transportation,
    } = req.body;

    if (startDate && new Date(startDate) < new Date().setHours(0, 0, 0, 0)) {
      return res
        .status(400)
        .json({ msg: "Trip start date cannot be in the past" });
    }

    if (budget !== undefined && budget < 0) {
      return res.status(400).json({ msg: "Budget cannot be negative" });
    }

    // Default images
    let images = [];
    if (destination) {
      // Find destination in DB by name case-insensitively
      const regex = new RegExp(`^${escapeRegExp(destination)}$`, "i");

      const dest = await Destination.findOne({
        name: regex,
      });

      if (dest && dest.images && dest.images.length > 0) {
        images = dest.images;
      }
    }

    const newTrip = new Trip({
      user: req.user.id,
      destination,
      images,
      startDate,
      endDate,
      description,
      budget: budget || 0,
      status: status || "planned",
      activities,
      accommodation,
      transportation,
    });

    const trip = await newTrip.save();
    res.json(trip);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get all trips for a user
exports.getUserTrips = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      Trip.find({ user: req.user.id })
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit),
      Trip.countDocuments({ user: req.user.id }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: trips,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get a specific trip
exports.getTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });

    if (!trip) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).send("Server error");
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  try {
    let trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });

    if (!trip) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.body.budget !== undefined && req.body.budget < 0) {
      return res.status(400).json({ msg: "Budget cannot be negative" });
    }

    const allowedFields = [
      "destination",
      "startDate",
      "endDate",
      "description",
      "budget",
      "status",
      "activities",
      "accommodation",
      "transportation",
    ];

    const updateData = { updatedAt: Date.now() };
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Update images if destination changed
    if (updateData.destination && updateData.destination !== trip.destination) {
      const regex = new RegExp(
        `^${escapeRegExp(updateData.destination)}$`,
        "i",
      );

      const dest = await Destination.findOne({
        name: regex,
      });

      if (dest && dest.images && dest.images.length > 0) {
        updateData.images = dest.images;
      }
    }

    trip.set(updateData);
    await trip.save();

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).send("Server error");
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });

    if (!trip) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Also delete all expenses and the packing list for this trip
    await Expense.deleteMany({ trip: req.params.id });
    await PackingList.deleteOne({ trip: req.params.id });
    await trip.deleteOne();
    res.json({ msg: "Trip removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).send("Server error");
  }
};
// Generate shareable link for a trip
exports.shareTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) return res.status(403).json({ message: "Access denied" });

    const token = crypto.randomBytes(20).toString("hex");
    trip.shareToken = token;
    trip.shareEnabled = true;
    await trip.save();

    res.json({ shareToken: token });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).send("Server error");
  }
};

// View shared trip (public, no auth needed)
exports.getSharedTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ shareToken: req.params.token });
    if (!trip || !trip.shareEnabled)
      return res.status(404).json({ msg: "Shared trip not found or disabled" });

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Enable/Disable trip sharing
exports.toggleTripSharing = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });

    if (!trip) {
      return res.status(403).json({ message: "Access denied" });
    }

    trip.shareEnabled = !trip.shareEnabled;

    await trip.save();

    res.json({
      shareEnabled: trip.shareEnabled,
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).send("Server error");
  }
};

// Generate full recommendation plan and populate all trip sections (Itinerary, Places, Budget, Packing, Notes, Weather)
exports.generateRecommendations = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const destination = trip.destination;
    const startDate = trip.startDate ? new Date(trip.startDate) : new Date();
    const endDate = trip.endDate
      ? new Date(trip.endDate)
      : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

    const diffDays = Math.max(
      1,
      Math.min(
        14,
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
      ),
    );

    const budget = req.body.budget
      ? Number(req.body.budget)
      : trip.budget > 0
        ? trip.budget
        : 15000;
    const pace = req.body.pace || "normal";
    const interests =
      Array.isArray(req.body.interests) && req.body.interests.length > 0
        ? req.body.interests
        : ["culture", "food"];
    const travellers = req.body.travellers ? Number(req.body.travellers) : 1;

    // 1. Geocode Destination
    let coords = null;
    try {
      coords = await nominatim.geocodeDestination(destination);
    } catch (_e) {
      coords = null;
    }

    if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
      const norm = normalizeCityName(destination);
      coords = SEED_COORDINATES[norm] || SEED_COORDINATES.jaipur;
    }

    // 2. Discover Places with Fallback
    const placeChain = [
      async () =>
        opentripmap.searchPlacesByRadius({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: 15,
          limit: 30,
        }),
      async () => getSeedPlaces(destination),
      async () => getSeedPlaces("jaipur"),
    ];

    const placeResult = await withFallback(placeChain, {
      timeoutMs: 5000,
      retries: 1,
      validate: (list) => Array.isArray(list) && list.length >= 3,
    });
    const places = placeResult.data;

    // 3. Fetch Weather Forecast
    let weather = null;
    try {
      weather = await openmeteo.fetchWeatherForecast({
        lat: coords.lat,
        lng: coords.lng,
        locationName: coords.name || destination,
      });
    } catch (_e) {
      weather = null;
    }

    if (!weather) {
      weather = {
        location: coords.name || destination,
        temperatureMax: 28,
        temperatureMin: 18,
        rainProbability: 10,
        source: "offline_fallback",
      };
    }

    // 4. Generate Pure Planner Plan
    const planSnapshot = generatePlan(
      {
        destination,
        days: diffDays,
        budget,
        currency: "INR",
        pace,
        interests,
        travellers,
        startDate: startDate.toISOString().split("T")[0],
      },
      places,
      weather,
    );

    // 5. Enrich with Wikivoyage Destination Guide
    try {
      const guide = await wikivoyage.fetchDestinationSummary(destination);
      if (guide) {
        planSnapshot.guide = guide;
      }
    } catch (_e) {
      // Non-critical
    }

    // 6. Enrich Places with Wikimedia Photos
    const placeEntries = Object.entries(planSnapshot.places || {});
    for (const [, pl] of placeEntries) {
      if (!pl.photos || pl.photos.length === 0) {
        if (pl.photoUrl) {
          pl.photos = [
            {
              url: pl.photoUrl,
              caption: pl.name,
              author: pl.photoCredit || "Curated Seed",
              license: "Public Domain / CC0",
            },
          ];
        } else {
          try {
            const photo = await wikimedia.fetchPlacePhoto(pl.name, destination);
            if (photo) {
              pl.photos = [photo];
              pl.photoUrl = photo.url;
              pl.photoCredit = `${photo.author} (${photo.license})`;
            }
          } catch (_e) {
            // Graceful photo fallback
          }
        }
      }
    }

    // 7. Apply to Trip Activities (Itinerary)
    const activities = [];
    (planSnapshot.days || []).forEach((d) => {
      const dayDate = new Date(startDate.getTime() + (d.day - 1) * 86400000);
      (d.items || []).forEach((item) => {
        const placeObj = planSnapshot.places[item.placeId] || {};
        activities.push({
          name: placeObj.name || "Activity",
          date: dayDate,
          location: placeObj.address || placeObj.name,
          notes: `${item.slot.toUpperCase()} • ${placeObj.category || "Sight"} • Est: ₹${placeObj.estCost || 0}`,
        });
      });
    });

    trip.activities = activities;
    trip.budget = budget;
    trip.planData = planSnapshot;

    // 8. Update Trip Notes & Description
    const guideText = planSnapshot.guide?.extract
      ? `\n\nDestination Background: ${planSnapshot.guide.extract}`
      : "";
    trip.description = `Recommendation plan for ${destination} (${diffDays} days, ${pace} pace, ₹${budget.toLocaleString()} budget). Includes ${Object.keys(planSnapshot.places).length} top attractions.${guideText}`;

    // 9. Save Plan Snapshot
    try {
      const savedPlan = await Plan.create({
        userId: req.user.id,
        tripId: trip._id,
        request: planSnapshot.request,
        days: planSnapshot.days,
        places: planSnapshot.places,
        budget: planSnapshot.budget,
        weather: planSnapshot.weather,
        packing: planSnapshot.packing,
        warnings: planSnapshot.warnings,
        guide: planSnapshot.guide,
        degraded: planSnapshot.degraded,
      });
      trip.planId = savedPlan._id;
    } catch (_e) {
      // Plan snapshot saved on trip.planData as well
    }

    // 10. Populate Initial Budget Expenses
    if (planSnapshot.budget) {
      try {
        await Expense.deleteMany({
          trip: trip._id,
          description: { $regex: /^\[Planned\]/i },
        });

        const plannedExpenses = [
          {
            category: "Accommodation",
            amount: planSnapshot.budget.stay,
            description: "[Planned] Accommodation Budget",
          },
          {
            category: "Food",
            amount: planSnapshot.budget.food,
            description: "[Planned] Dining & Food Budget",
          },
          {
            category: "Transportation",
            amount: planSnapshot.budget.transport,
            description: "[Planned] Local Transport Budget",
          },
          {
            category: "Activities",
            amount: planSnapshot.budget.activities,
            description: "[Planned] Sightseeing & Entry Tickets",
          },
        ];

        for (const exp of plannedExpenses) {
          if (exp.amount > 0) {
            await Expense.create({
              user: req.user.id,
              trip: trip._id,
              amount: exp.amount,
              currency: "INR",
              category: exp.category,
              description: exp.description,
              date: startDate,
            });
          }
        }
      } catch (_e) {
        console.warn("Could not save initial planned expenses:", _e.message);
      }
    }

    // 11. Populate Packing Checklist
    if (Array.isArray(planSnapshot.packing) && planSnapshot.packing.length > 0) {
      try {
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
          if (
            r.includes("med") ||
            r.includes("pill") ||
            r.includes("first aid")
          )
            return "Medicine";
          return "Other";
        };

        const itemsToAdd = planSnapshot.packing.map((p) => ({
          name: p.item,
          category: categoryMap(p.reason),
          packed: false,
        }));

        let packingDoc = await PackingList.findOne({ trip: trip._id });
        if (packingDoc) {
          packingDoc.items = itemsToAdd;
          await packingDoc.save();
        } else {
          await PackingList.create({
            trip: trip._id,
            user: req.user.id,
            items: itemsToAdd,
          });
        }
      } catch (_e) {
        console.warn("Could not save packing list:", _e.message);
      }
    }

    await trip.save();

    return res.json({
      success: true,
      trip,
      plan: planSnapshot,
      message:
        "Recommendation plan generated and applied across all trip sections!",
    });
  } catch (err) {
    console.error("Generate recommendations failed:", err);
    return res.status(500).json({
      message: err.message || "Failed to generate recommendation plan.",
    });
  }
};
