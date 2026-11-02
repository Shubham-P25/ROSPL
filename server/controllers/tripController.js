const crypto = require("crypto");
const Trip = require("../models/Trip");
const Destination = require("../models/Destination");
const Expense = require("../models/Expense");
const PackingList = require("../models/PackingList");
const Plan = require("../models/Plan");
const { generatePlan } = require("../planner/index");
const { getSeedPlaces, normalizeCityName } = require("../seed/index");
const { withFallback } = require("../lib/withFallback");
const { CATEGORIES } = require("../schemas/place");
const nominatim = require("../providers/nominatim");

const CATEGORY_MAP = {
  adventure: ["adventure", "game", "climb", "sport", "trail", "trek"],
  nature: ["nature", "beach", "coastal", "wildlife", "park", "lake", "mountain", "hill"],
  culture: ["culture", "heritage", "palace", "fort", "historic", "monument", "museum", "sightseeing", "art"],
  food: ["food", "street eats", "culinary", "restaurant", "cafe", "dining", "eats"],
  shopping: ["shopping", "bazaar", "market", "mall", "souvenir", "craft"],
  religious: ["religious", "religion", "spiritual", "temple", "church", "mosque", "ghat", "ashram"],
  nightlife: ["nightlife", "night", "bar", "club", "pub", "leisure", "entertainment"],
};

function normalizeInterests(inputList) {
  if (!Array.isArray(inputList) || inputList.length === 0) {
    return ["culture", "food", "nature"];
  }

  const validCategories = new Set(CATEGORIES);
  const matched = new Set();

  for (const raw of inputList) {
    if (typeof raw !== "string") continue;
    const clean = raw.toLowerCase().trim();
    if (!clean) continue;

    if (validCategories.has(clean)) {
      matched.add(clean);
      continue;
    }

    let found = false;
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.some((kw) => clean.includes(kw) || kw.includes(clean))) {
        matched.add(cat);
        found = true;
        break;
      }
    }
    if (!found) {
      matched.add("other");
    }
  }

  const result = Array.from(matched).filter((cat) => validCategories.has(cat));
  if (result.length === 0) {
    return ["culture", "food"];
  }
  return result.slice(0, 6);
}

function normalizePace(rawPace, daysPerSpot) {
  const p = (rawPace || "").toLowerCase().trim();
  if (p === "relaxed" || p === "packed" || p === "normal") {
    return p;
  }
  if (p === "fast") return "packed";
  if (p === "balanced") return "normal";

  const d = Number(daysPerSpot) || 3;
  if (d >= 4) return "relaxed";
  if (d <= 2) return "packed";
  return "normal";
}

// In-flight generation promise map to avoid concurrent duplicate runs
const activePlanGenerations = new Map();
const opentripmap = require("../providers/opentripmap");
const openmeteo = require("../providers/openmeteo");
const wikivoyage = require("../providers/wikivoyage");
const wikimedia = require("../providers/wikimedia");

const SEED_COORDINATES = {
  jaipur: { lat: 26.9124, lng: 75.7872, name: "Jaipur" },
  goa: { lat: 15.2993, lng: 74.124, name: "Goa" },
  varanasi: { lat: 25.3176, lng: 82.9739, name: "Varanasi" },
};

const DESTINATION_HERO_IMAGES = {
  kerala: [
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/Kochi%2C_Fishing_nets_at_sunset%2C_Kerala%2C_India.jpg",
    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80",
    "https://upload.wikimedia.org/wikipedia/commons/4/4d/Kerala_Kumarakom_Bird_Sanctuary.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/Kovalam_beach_trivandrum_kerala.jpg",
  ],
  mumbai: [
    "https://upload.wikimedia.org/wikipedia/commons/7/74/Mumbai_03-2016_27_skyline_at_Marine_Drive.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg",
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1600&q=80",
    "https://upload.wikimedia.org/wikipedia/commons/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg",
  ],
  jaipur: [
    "https://upload.wikimedia.org/wikipedia/commons/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg",
    "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1600&q=80",
  ],
  udaipur: [
    "https://upload.wikimedia.org/wikipedia/commons/4/40/City_Palace%2C_Udaipur.jpg",
    "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1600&q=80",
  ],
  goa: [
    "https://upload.wikimedia.org/wikipedia/commons/e/e0/Goa_Sunset.jpg",
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
  ],
  varanasi: [
    "https://upload.wikimedia.org/wikipedia/commons/0/00/Varanasi_Ghats.jpg",
    "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1600&q=80",
  ],
  delhi: [
    "https://upload.wikimedia.org/wikipedia/commons/0/09/India_Gate_in_New_Delhi_03-2016.jpg",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1600&q=80",
  ],
  agra: [
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Taj_Mahal%2C_Agra%2C_India_edit3.jpg",
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1600&q=80",
  ],
  manali: [
    "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1600&q=80",
  ],
  srinagar: [
    "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1600&q=80",
  ],
  ladakh: [
    "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1600&q=80",
  ],
  rishikesh: [
    "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1600&q=80",
  ],
  bangalore: [
    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1600&q=80",
  ],
  hampi: [
    "https://images.unsplash.com/photo-1600100397608-f010f443b749?auto=format&fit=crop&w=1600&q=80",
  ],
  amritsar: [
    "https://images.unsplash.com/photo-1588096344356-9a25b1747805?auto=format&fit=crop&w=1600&q=80",
  ],
};

async function resolveDestinationImages(destination) {
  if (!destination) return [];
  const key = destination.trim().toLowerCase();

  for (const [k, imgs] of Object.entries(DESTINATION_HERO_IMAGES)) {
    if (key.includes(k) || k.includes(key)) {
      return imgs;
    }
  }

  try {
    const regex = new RegExp(`^${escapeRegExp(destination)}$`, "i");
    const dest = await Destination.findOne({
      $or: [{ name: regex }, { city: regex }, { state: regex }],
    });
    if (dest && dest.images && dest.images.length > 0) {
      return dest.images;
    }
  } catch (_e) {}

  return [
    "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1600&q=80",
  ];
}

/**
 * Escape special regex metacharacters in a string so it can be safely
 * interpolated into a RegExp without altering the intended pattern.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Execute full multi-provider plan generation across all 9 trip sections
 */
async function executeTripPlanGeneration(trip, options = {}, userId) {
  const destination = trip.destination;
  const startDate = trip.startDate ? new Date(trip.startDate) : new Date();
  const endDate = trip.endDate
    ? new Date(trip.endDate)
    : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  const diffDays = Math.max(
    1,
    Math.min(14, Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1),
  );

  const budget =
    options.budget !== undefined && Number(options.budget) > 0
      ? Number(options.budget)
      : trip.budget > 0
        ? trip.budget
        : 25000;

  const numberOfPeople =
    Number(options.numberOfPeople || trip.numberOfPeople) || 1;
  const transportType =
    options.transportType || trip.transportType || "vehicle";
  const daysPerSpot = Number(options.daysPerSpot || trip.daysPerSpot) || 3;
  const famousSpot = (options.famousSpot || trip.famousSpot || "").trim();
  const rawInterests =
    Array.isArray(options.interests) && options.interests.length > 0
      ? options.interests
      : Array.isArray(trip.interests) && trip.interests.length > 0
        ? trip.interests
        : ["culture", "food", "nature"];
  const interests = normalizeInterests(rawInterests);
  const pace = normalizePace(options.pace || trip.pace, daysPerSpot);

  // 1. Geocode Destination
  let coords = null;
  try {
    coords = await nominatim.geocodeDestination(destination);
  } catch (_e) {
    coords = null;
  }

  if (
    !coords ||
    typeof coords.lat !== "number" ||
    typeof coords.lng !== "number"
  ) {
    const norm = normalizeCityName(destination);
    coords = SEED_COORDINATES[norm] || SEED_COORDINATES.jaipur;
  }

  // 2. Discover Places with Fallback
  const placeChain = [
    async () =>
      opentripmap.searchPlacesByRadius({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm: 20,
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

  // If user specified a famous spot / must-see spot from vlogs, inject it as top spot
  if (famousSpot) {
    const famousId = "custom_famous_spot";
    const exists = places.some(
      (p) => (p.name || "").toLowerCase() === famousSpot.toLowerCase(),
    );
    if (!exists) {
      places.unshift({
        id: famousId,
        name: famousSpot,
        category: "Must-See Highlight",
        estCost: Math.round(budget * 0.02),
        rating: 4.9,
        visitMinutes: 120,
        address: `${famousSpot}, ${destination}`,
        description: `Featured highlight requested by travelers for this journey (popularized in travel vlogs).`,
        isFamousSpot: true,
      });
    }
  }

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
  let safeStartDateStr = undefined;
  if (startDate instanceof Date && !isNaN(startDate.getTime())) {
    safeStartDateStr = startDate.toISOString().split("T")[0];
  }

  const planSnapshot = generatePlan(
    {
      destination: (destination || "Destination").trim().slice(0, 100),
      days: diffDays,
      budget: Math.max(100, Math.min(100000000, Number(budget) || 25000)),
      currency: "INR",
      pace,
      interests,
      travellers: Math.max(1, Math.min(20, Math.round(numberOfPeople))),
      startDate: safeStartDateStr,
    },
    places,
    weather,
  );

  // 5. Enrich with Wikivoyage Guide
  try {
    const guide = await wikivoyage.fetchDestinationSummary(destination);
    if (guide) {
      planSnapshot.guide = guide;
    }
  } catch (_e) {}

  // 6. Enrich Places with Wikimedia Photos & YouTube Vlog URLs
  const placeEntries = Object.entries(planSnapshot.places || {});
  for (const [, pl] of placeEntries) {
    const vlogQuery = encodeURIComponent(
      `${pl.name} ${destination} travel vlog`,
    );
    pl.vlogUrl = `https://www.youtube.com/results?search_query=${vlogQuery}`;
    pl.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pl.name + " " + destination)}`;

    if (!pl.photos || pl.photos.length === 0) {
      if (pl.photoUrl) {
        pl.photos = [
          {
            url: pl.photoUrl,
            caption: pl.name,
            author: pl.photoCredit || "Curated Destination Media",
            license: "Public Domain / CC",
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
        } catch (_e) {}
      }
    }
  }

  // 7. Apply to Trip Activities (Itinerary) with YouTube Vlog links
  const activities = [];
  (planSnapshot.days || []).forEach((d) => {
    const dayDate = new Date(startDate.getTime() + (d.day - 1) * 86400000);
    (d.items || []).forEach((item) => {
      const placeObj = planSnapshot.places[item.placeId] || {};
      const vlogQuery = encodeURIComponent(
        `${placeObj.name} ${destination} travel vlog`,
      );
      activities.push({
        name: placeObj.name || "Activity",
        date: dayDate,
        location: placeObj.address || placeObj.name,
        notes: `${item.slot.toUpperCase()} • ${placeObj.category || "Sight"} • Est: ₹${placeObj.estCost || 0}`,
        vlogUrl:
          placeObj.vlogUrl ||
          `https://www.youtube.com/results?search_query=${vlogQuery}`,
        day: d.day,
      });
    });
  });

  trip.activities = activities;
  trip.budget = budget;
  trip.numberOfPeople = numberOfPeople;
  trip.transportType = transportType;
  trip.daysPerSpot = daysPerSpot;
  trip.famousSpot = famousSpot;
  trip.interests = interests;
  trip.planData = planSnapshot;

  if (!trip.images || trip.images.length === 0) {
    trip.images = await resolveDestinationImages(destination);
  }

  // Update trip description
  const guideText = planSnapshot.guide?.extract
    ? `\n\nDestination Background: ${planSnapshot.guide.extract}`
    : "";
  trip.description = `Curated journey for ${destination} (${diffDays} days, ${numberOfPeople} traveler${numberOfPeople > 1 ? "s" : ""}, ₹${budget.toLocaleString("en-IN")} target budget). Transit: ${transportType}.${guideText}`;

  // 8. Save Plan Document
  try {
    const savedPlan = await Plan.create({
      userId: userId || trip.user,
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
  } catch (_e) {}

  // 9. Populate Initial Budget Expenses Distributed Across Categories & Travelers
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
          description: `[Planned] Accommodation (${numberOfPeople} traveler${numberOfPeople > 1 ? "s" : ""})`,
        },
        {
          category: "Food",
          amount: planSnapshot.budget.food,
          description: `[Planned] Dining & Street Food (${numberOfPeople} traveler${numberOfPeople > 1 ? "s" : ""})`,
        },
        {
          category: "Transportation",
          amount: planSnapshot.budget.transport,
          description: `[Planned] ${transportType.toUpperCase()} & Local Transit`,
        },
        {
          category: "Activities",
          amount: planSnapshot.budget.activities,
          description: "[Planned] Monument Entry & Sightseeing Passes",
        },
      ];

      for (const exp of plannedExpenses) {
        if (exp.amount > 0) {
          await Expense.create({
            user: userId || trip.user,
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

  // 10. Populate Packing Checklist
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

      await PackingList.findOneAndUpdate(
        { trip: trip._id },
        {
          $set: {
            user: userId || trip.user,
            items: itemsToAdd,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (_e) {
      console.warn("Could not save packing list:", _e.message);
    }
  }

  const updatedTrip = await Trip.findByIdAndUpdate(
    trip._id,
    {
      $set: {
        activities,
        budget,
        numberOfPeople,
        transportType,
        daysPerSpot,
        famousSpot,
        interests: trip.interests && trip.interests.length > 0 ? trip.interests : interests,
        planData: planSnapshot,
        images: trip.images && trip.images.length > 0 ? trip.images : await resolveDestinationImages(destination),
        description: trip.description,
        planId: trip.planId,
      },
    },
    { new: true },
  );

  return updatedTrip || trip;
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
      numberOfPeople,
      transportType,
      interests,
      daysPerSpot,
      famousSpot,
      startingLocation,
      originCity,
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
    const images = await resolveDestinationImages(destination);

    // Normalize transport
    const resolvedTransportType =
      transportType ||
      (typeof transportation === "object" && transportation?.type
        ? transportation.type
        : typeof transportation === "string"
        ? transportation
        : "vehicle");

    const resolvedTransportation =
      typeof transportation === "object" && transportation !== null
        ? transportation
        : { type: resolvedTransportType };

    const resolvedStartingLocation = (
      startingLocation ||
      originCity ||
      ""
    ).trim();

    const newTrip = new Trip({
      user: req.user.id,
      destination,
      images,
      startDate,
      endDate,
      description,
      budget: budget ? Number(budget) : 25000,
      status: status || "planned",
      activities: activities || [],
      accommodation,
      transportation: resolvedTransportation,
      numberOfPeople: numberOfPeople ? Number(numberOfPeople) : 1,
      transportType: resolvedTransportType,
      interests: Array.isArray(interests) ? interests : [],
      daysPerSpot: daysPerSpot ? Number(daysPerSpot) : 3,
      famousSpot: famousSpot || "",
      startingLocation: resolvedStartingLocation,
    });

    let trip = await newTrip.save();
    const tripIdStr = trip._id.toString();

    // Automatically generate full recommendation plan across all 9 sections
    try {
      const genPromise = executeTripPlanGeneration(trip, req.body, req.user.id);
      activePlanGenerations.set(tripIdStr, genPromise);
      try {
        trip = await genPromise;
      } finally {
        activePlanGenerations.delete(tripIdStr);
      }
    } catch (genErr) {
      console.warn("Auto-plan generation on createTrip:", genErr.message);
    }

    res.json(trip);
  } catch (err) {
    console.error("Trip creation failed:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
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
    let trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });

    if (!trip) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Auto-generate plan if trip doesn't have planData or activities yet
    if (!trip.planData || !trip.activities || trip.activities.length === 0) {
      const tripIdStr = trip._id.toString();
      try {
        if (activePlanGenerations.has(tripIdStr)) {
          trip = await activePlanGenerations.get(tripIdStr);
        } else {
          const genPromise = executeTripPlanGeneration(trip, {}, req.user.id);
          activePlanGenerations.set(tripIdStr, genPromise);
          try {
            trip = await genPromise;
          } finally {
            activePlanGenerations.delete(tripIdStr);
          }
        }
      } catch (genErr) {
        console.warn("Auto-plan generation on getTrip:", genErr.message);
        trip = (await Trip.findOne({ _id: req.params.id, user: req.user.id })) || trip;
      }
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
      "numberOfPeople",
      "transportType",
      "interests",
      "daysPerSpot",
      "famousSpot",
      "startingLocation",
    ];

    const updateData = { updatedAt: Date.now() };
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.originCity !== undefined && updateData.startingLocation === undefined) {
      updateData.startingLocation = req.body.originCity;
    }

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

    const updatedTrip = await executeTripPlanGeneration(trip, req.body, req.user.id);
    return res.json({
      success: true,
      trip: updatedTrip,
      plan: updatedTrip.planData,
      message: "Recommendation plan generated and applied across all trip sections!",
    });
  } catch (err) {
    console.error("Generate recommendations failed:", err);
    return res.status(500).json({
      message: err.message || "Failed to generate recommendation plan.",
    });
  }
};
