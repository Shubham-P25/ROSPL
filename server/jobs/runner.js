/**
 * jobs/runner.js
 * In-process background job runner with stage updates, concurrency control,
 * and resilient provider integration.
 */
const mongoose = require("mongoose");
const PlanJob = require("./model");
const Plan = require("../models/Plan");
const { generatePlan } = require("../planner/index");
const { getSeedPlaces, normalizeCityName } = require("../seed/index");
const { withFallback } = require("../lib/withFallback");
const logger = require("../lib/logger");

// Provider adapters
const nominatim = require("../providers/nominatim");
const opentripmap = require("../providers/opentripmap");
const openmeteo = require("../providers/openmeteo");
const wikivoyage = require("../providers/wikivoyage");
const wikimedia = require("../providers/wikimedia");
const frankfurter = require("../providers/frankfurter");

const MAX_CONCURRENT_JOBS = parseInt(
  process.env.PLANNER_MAX_CONCURRENT_JOBS || "3",
  10,
);

const SEED_COORDINATES = {
  jaipur: { lat: 26.9124, lng: 75.7872, name: "Jaipur" },
  goa: { lat: 15.2993, lng: 74.124, name: "Goa" },
  varanasi: { lat: 25.3176, lng: 82.9739, name: "Varanasi" },
};

let activeRunningCount = 0;
const inMemoryJobs = new Map(); // Fallback when running without MongoDB

/**
 * On server boot, mark any jobs stuck in 'running' for > 2 min as failed.
 */
async function sweepStuckJobs() {
  try {
    if (mongoose.connection.readyState === 1) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const res = await PlanJob.collection.updateMany(
        {
          status: "running",
          updatedAt: { $lt: twoMinutesAgo },
        },
        {
          $set: {
            status: "failed",
            error: "Job interrupted due to server reboot. Please retry.",
          },
        },
      );
      if (res && res.modifiedCount > 0) {
        logger.info("Swept stuck running jobs on boot", {
          count: res.modifiedCount,
        });
      }
    }
  } catch (err) {
    logger.warn("Could not sweep stuck jobs on boot", { error: err.message });
  }
}

function normalizeRequest(req = {}) {
  const normalized = { ...req };
  if (normalized.durationDays && !normalized.days) {
    normalized.days = normalized.durationDays;
  }
  if (normalized.pace === "medium") {
    normalized.pace = "normal";
  }
  return normalized;
}

/**
 * Create a new PlanJob in Mongo or in-memory
 */
async function createPlanJob(rawRequest, userId = null) {
  const request = normalizeRequest(rawRequest);
  // Check user concurrency limit (max 1 running job per user)
  if (userId && mongoose.connection.readyState === 1) {
    const existing = await PlanJob.findOne({
      userId,
      status: { $in: ["queued", "running"] },
    });
    if (existing) {
      const error = new Error(
        "You already have a trip plan currently generating.",
      );
      error.statusCode = 429;
      throw error;
    }
  }

  let job;
  if (mongoose.connection.readyState === 1) {
    job = await PlanJob.create({
      userId,
      request,
      status: "queued",
      progress: 0,
      stage: "places",
    });
  } else {
    const id = new mongoose.Types.ObjectId().toString();
    job = {
      _id: id,
      userId,
      request,
      status: "queued",
      progress: 0,
      stage: "places",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryJobs.set(id, job);
  }

  // Trigger processing asynchronously without blocking
  setImmediate(() => processNextJobs());

  return job;
}

/**
 * Update job progress & stage
 */
async function updateJobStage(jobId, stage, progress, extra = {}) {
  const updates = { stage, progress, ...extra, updatedAt: new Date() };

  if (mongoose.connection.readyState === 1) {
    await PlanJob.findByIdAndUpdate(jobId, { $set: updates });
  }

  const mem = inMemoryJobs.get(jobId.toString());
  if (mem) {
    Object.assign(mem, updates);
  }
}

/**
 * Get job status
 */
async function getJobById(jobId) {
  if (mongoose.connection.readyState === 1) {
    const doc = await PlanJob.findById(jobId).lean();
    if (doc) return doc;
  }
  return inMemoryJobs.get(jobId.toString()) || null;
}

/**
 * Execute job pipeline with multi-provider fallbacks
 */
async function executeJob(job) {
  job.request = normalizeRequest(job.request);
  const jobId = job._id.toString();
  const startTime = Date.now();
  const destination = job.request.destination;
  const degraded = [];

  logger.info("Starting resilient plan generation job", {
    jobId,
    destination,
  });

  try {
    activeRunningCount++;
    await updateJobStage(jobId, "places", 10, { status: "running" });

    // Stage 1: Geocoding via Nominatim with Seed Fallback
    let coords = null;
    try {
      coords = await nominatim.geocodeDestination(destination);
    } catch (_err) {
      coords = null;
    }

    if (
      !coords ||
      typeof coords.lat !== "number" ||
      typeof coords.lng !== "number"
    ) {
      const normCity = normalizeCityName(destination);
      coords = SEED_COORDINATES[normCity] || SEED_COORDINATES.jaipur;
      degraded.push("geocoding:seed-fallback");
    }

    // Stage 2: Place Discovery (OpenTripMap -> Seed -> Default Jaipur Seed)
    await updateJobStage(jobId, "places", 30);
    const placeChain = [
      async () => {
        return await opentripmap.searchPlacesByRadius({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: 15,
          limit: 30,
        });
      },
      async () => {
        return getSeedPlaces(destination);
      },
      async () => {
        return getSeedPlaces("jaipur");
      },
    ];

    const placeResult = await withFallback(placeChain, {
      timeoutMs: 5000,
      retries: 1,
      validate: (list) => Array.isArray(list) && list.length >= 3,
    });

    let places = placeResult.data;
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      const { haversineKm } = require("../lib/haversine");
      const filtered = places.filter((p) => {
        if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return false;
        return haversineKm(coords, { lat: p.lat, lng: p.lng }) <= 80;
      });
      if (filtered.length >= 3) {
        places = filtered;
      }
    }
    if (placeResult.degraded) {
      degraded.push("places:seed-fallback");
    }

    // Stage 3: Weather Forecast via Open-Meteo
    await updateJobStage(jobId, "weather", 50);
    let weather = null;
    try {
      weather = await openmeteo.fetchWeatherForecast({
        lat: coords.lat,
        lng: coords.lng,
        locationName: coords.name || destination,
      });
    } catch (_err) {
      weather = null;
    }

    if (!weather) {
      degraded.push("weather");
      weather = {
        location: coords.name || destination,
        temperatureMax: 28,
        temperatureMin: 18,
        rainProbability: 10,
        source: "offline_fallback",
      };
    }

    // Stage 4: Pure Planner Algorithm (deterministic scoring, clustering, ordering, slots, budget, packing)
    await updateJobStage(jobId, "planning", 70);
    const planSnapshot = generatePlan(job.request, places, weather, {
      degraded,
    });

    // Destination guide summary via Wikivoyage (non-blocking)
    try {
      const guide = await wikivoyage.fetchDestinationSummary(destination);
      if (guide) {
        planSnapshot.guide = guide;
      }
    } catch (_e) {
      // Guide is non-critical
    }

    // Stage 5: Photo Enrichment via Wikimedia Commons for selected stops
    await updateJobStage(jobId, "photos", 85);
    const placeEntries = Object.entries(planSnapshot.places || {});
    for (const [, place] of placeEntries) {
      if (!place.photos || place.photos.length === 0) {
        if (place.photoUrl) {
          place.photos = [
            {
              url: place.photoUrl,
              caption: place.name,
              author: place.photoCredit || "Curated Seed",
              license: "Public Domain / CC0",
              licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
            },
          ];
        } else {
          try {
            const photo = await wikimedia.fetchPlacePhoto(
              place.name,
              destination,
            );
            if (photo) {
              place.photos = [photo];
              place.photoUrl = photo.url;
              place.photoCredit = `${photo.author} (${photo.license})`;
            }
          } catch (_e) {
            // Graceful photo fallback
          }
        }
      }
    }

    // Currency conversion if requested currency is not INR
    if (job.request.currency && job.request.currency.toUpperCase() !== "INR") {
      try {
        const rateInfo = await frankfurter.getExchangeRate(
          "INR",
          job.request.currency,
        );
        if (rateInfo) {
          planSnapshot.exchangeRate = rateInfo;
        }
      } catch (_e) {
        // Exchange rate is optional enrichment
      }
    }

    // Stage 6: Saving snapshot
    await updateJobStage(jobId, "saving", 95);
    let planId;

    if (mongoose.connection.readyState === 1) {
      const savedPlan = await Plan.create({
        userId: job.userId,
        request: planSnapshot.request,
        days: planSnapshot.days,
        places: planSnapshot.places,
        budget: planSnapshot.budget,
        weather: planSnapshot.weather,
        packing: planSnapshot.packing,
        warnings: planSnapshot.warnings,
        degraded: planSnapshot.degraded,
        guide: planSnapshot.guide,
        exchangeRate: planSnapshot.exchangeRate,
        generatedAt: planSnapshot.generatedAt,
        schemaVersion: planSnapshot.schemaVersion,
      });
      planId = savedPlan._id;
    } else {
      planId = new mongoose.Types.ObjectId();
      planSnapshot._id = planId;
      inMemoryJobs.set(`plan:${planId}`, planSnapshot);
    }

    // Mark job done
    const durationMs = Date.now() - startTime;
    await updateJobStage(jobId, "saving", 100, {
      status: "done",
      planId,
    });

    logger.info("Completed resilient plan generation job", {
      jobId,
      planId,
      durationMs,
      degraded: planSnapshot.degraded,
    });
  } catch (err) {
    logger.error("Job execution failed", {
      jobId,
      error: err.message,
      stack: err.stack,
    });
    await updateJobStage(jobId, "saving", 100, {
      status: "failed",
      error: err.message || "Failed to generate travel plan.",
    });
  } finally {
    activeRunningCount = Math.max(0, activeRunningCount - 1);
    setImmediate(() => processNextJobs());
  }
}

/**
 * Queue processing loop
 */
async function processNextJobs() {
  if (activeRunningCount >= MAX_CONCURRENT_JOBS) {
    return;
  }

  let nextJob = null;
  if (mongoose.connection.readyState === 1) {
    nextJob = await PlanJob.findOneAndUpdate(
      { status: "queued" },
      { $set: { status: "running" } },
      { sort: { createdAt: 1 }, new: true },
    );
  } else {
    for (const job of inMemoryJobs.values()) {
      if (job.status === "queued") {
        job.status = "running";
        nextJob = job;
        break;
      }
    }
  }

  if (nextJob) {
    executeJob(nextJob);
  }
}

module.exports = {
  createPlanJob,
  getJobById,
  sweepStuckJobs,
  processNextJobs,
  executeJob,
  inMemoryJobs,
};
