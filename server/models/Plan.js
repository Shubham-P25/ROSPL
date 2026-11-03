/**
 * models/Plan.js
 * Mongoose model for immutable saved Plan snapshots.
 */
const mongoose = require("mongoose");

const PlanModelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: false,
    },
    revision: {
      type: Number,
      default: 1,
    },
    request: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    days: [
      {
        day: Number,
        items: [
          {
            placeId: String,
            slot: {
              type: String,
              enum: ["morning", "afternoon", "evening"],
            },
            travelMinutesFromPrev: Number,
          },
        ],
        estCost: Number,
      },
    ],
    places: {
      type: mongoose.Schema.Types.Mixed, // Map of placeId -> Place
      required: true,
    },
    budget: {
      stay: Number,
      food: Number,
      transport: Number,
      activities: Number,
      buffer: Number,
    },
    weather: mongoose.Schema.Types.Mixed,
    packing: [
      {
        item: String,
        reason: String,
      },
    ],
    warnings: [String],
    degraded: [String],
    guide: mongoose.Schema.Types.Mixed,
    exchangeRate: mongoose.Schema.Types.Mixed,
    generatedAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
    schemaVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: "plans",
  },
);

const Plan = mongoose.models.Plan || mongoose.model("Plan", PlanModelSchema);

module.exports = Plan;
