/**
 * jobs/model.js
 * MongoDB model for tracking background plan generation jobs.
 */
const mongoose = require("mongoose");

const PlanJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for guest/test mode
    },
    status: {
      type: String,
      enum: ["queued", "running", "done", "failed"],
      default: "queued",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    stage: {
      type: String,
      enum: ["geocode", "places", "weather", "planning", "photos", "saving"],
      default: "places",
    },
    request: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "plan_jobs",
  },
);

const PlanJob =
  mongoose.models.PlanJob || mongoose.model("PlanJob", PlanJobSchema);

module.exports = PlanJob;
