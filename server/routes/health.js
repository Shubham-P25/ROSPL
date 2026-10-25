/**
 * routes/health.js
 * Health status endpoint for database and external providers.
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const providerHealth = {
  opentripmap: { status: "ready", lastCheck: new Date().toISOString() },
  nominatim: { status: "ready", lastCheck: new Date().toISOString() },
  openmeteo: { status: "ready", lastCheck: new Date().toISOString() },
  wikivoyage: { status: "ready", lastCheck: new Date().toISOString() },
  wikimedia: { status: "ready", lastCheck: new Date().toISOString() },
  frankfurter: { status: "ready", lastCheck: new Date().toISOString() },
};

function recordProviderStatus(provider, ok, message = null) {
  if (providerHealth[provider]) {
    providerHealth[provider] = {
      status: ok ? "healthy" : "degraded",
      lastCheck: new Date().toISOString(),
      message,
    };
  }
}

router.get("/", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? "connected"
      : mongoose.connection.readyState === 2
        ? "connecting"
        : "disconnected";

  const allHealthy = dbStatus === "connected";

  res.status(allHealthy ? 200 : 200).json({
    status: allHealthy ? "healthy" : "degraded",
    database: {
      status: dbStatus,
    },
    providers: providerHealth,
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  router,
  recordProviderStatus,
  providerHealth,
};
