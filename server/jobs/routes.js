/**
 * jobs/routes.js
 * API routes for creating and polling planner jobs.
 */
const express = require("express");
const router = express.Router();
const { PlanRequestSchema } = require("../schemas/request");
const { createPlanJob, getJobById } = require("./runner");

// Optional auth: if user is logged in, attach their userId
function optionalAuth(req, res, next) {
  const token =
    req.header("x-auth-token") ||
    (req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", ""));
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user || decoded;
    } catch (_e) {
      // Invalid token - continue as unauthenticated guest
    }
  }
  next();
}

// POST /api/planner/jobs - Create a plan job
router.post("/jobs", optionalAuth, async (req, res) => {
  try {
    const parseResult = PlanRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        },
      });
    }

    const userId = req.user?.id || null;
    const job = await createPlanJob(parseResult.data, userId);

    return res.status(202).json({
      jobId: job._id.toString(),
      status: job.status,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: {
        code: status === 429 ? "RATE_LIMITED" : "SERVER_ERROR",
        message: err.message || "Failed to create planner job.",
      },
    });
  }
});

// GET /api/planner/jobs/:id - Get job status
router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    return res.json({
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      planId: job.planId || null,
      error: job.error || null,
      updatedAt: job.updatedAt,
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to retrieve job status.",
      },
    });
  }
});

module.exports = router;
