/**
 * jobs/runner.js
 * In-process background job runner with stage updates and concurrency control.
 */
const mongoose = require("mongoose");
const PlanJob = require("./model");
const Plan = require("../models/Plan");
const { generatePlan } = require("../planner/index");
const { getSeedPlaces } = require("../seed/index");
const logger = require("../lib/logger");

const MAX_CONCURRENT_JOBS = parseInt(
  process.env.PLANNER_MAX_CONCURRENT_JOBS || "3",
  10,
);

let activeRunningCount = 0;
const inMemoryJobs = new Map(); // Fallback when running without MongoDB

/**
 * On server boot, mark any jobs stuck in 'running' for > 2 min as failed.
 */
async function sweepStuckJobs() {
  try {
    if (mongoose.connection.readyState === 1) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const res = await PlanJob.updateMany(
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
      if (res.modifiedCount > 0) {
        logger.info("Swept stuck running jobs on boot", {
          count: res.modifiedCount,
        });
      }
    }
  } catch (err) {
    logger.warn("Could not sweep stuck jobs on boot", { error: err.message });
  }
}

/**
 * Create a new PlanJob in Mongo or in-memory
 */
async function createPlanJob(request, userId = null) {
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
 * Execute job pipeline
 */
async function executeJob(job) {
  const jobId = job._id.toString();
  const startTime = Date.now();
  logger.info("Starting plan generation job", {
    jobId,
    destination: job.request.destination,
  });

  try {
    activeRunningCount++;
    await updateJobStage(jobId, "places", 10, { status: "running" });

    const destination = job.request.destination;
    const degraded = [];

    // Stage 1 & 2: Places (Phase 1 uses seed fallback)
    await updateJobStage(jobId, "places", 30);
    let places = getSeedPlaces(destination);

    if (places.length === 0) {
      // Default to Jaipur if unknown seed destination during foundation phase
      places = getSeedPlaces("jaipur");
      degraded.push("places:seed-fallback");
    }

    // Stage 3: Weather (Phase 1 mock/degraded)
    await updateJobStage(jobId, "weather", 50);
    const mockWeather = {
      location: destination,
      temperatureMax: 30,
      temperatureMin: 18,
      rainProbability: 10,
    };

    // Stage 4: Pure Planner Core
    await updateJobStage(jobId, "planning", 70);
    const planSnapshot = generatePlan(job.request, places, mockWeather, {
      degraded,
    });

    // Stage 5: Photos & Descriptions
    await updateJobStage(jobId, "photos", 85);

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
        generatedAt: planSnapshot.generatedAt,
        schemaVersion: planSnapshot.schemaVersion,
      });
      planId = savedPlan._id;
    } else {
      planId = new mongoose.Types.ObjectId();
      inMemoryJobs.set(`plan:${planId}`, planSnapshot);
    }

    // Mark job done
    const durationMs = Date.now() - startTime;
    await updateJobStage(jobId, "saving", 100, {
      status: "done",
      planId,
    });

    logger.info("Completed plan generation job", {
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
  inMemoryJobs,
};
