import { describe, it, expect, vi } from "vitest";
const { executeJob, inMemoryJobs } = require("../../jobs/runner");

describe("Runner Pipeline Resilient Integration", () => {
  it("executes complete plan generation with fallbacks when destination is seeded", async () => {
    const job = {
      _id: "test-pipeline-job-1",
      userId: null,
      request: {
        destination: "Jaipur",
        durationDays: 3,
        budget: 15000,
        currency: "INR",
        pace: "medium",
        interests: ["culture", "food"],
        groupType: "couple",
        season: "winter",
      },
      status: "queued",
      progress: 0,
      stage: "places",
    };

    inMemoryJobs.set(job._id, job);

    await executeJob(job);

    const updatedJob = inMemoryJobs.get(job._id);
    expect(updatedJob.status).toBe("done");
    expect(updatedJob.progress).toBe(100);
    expect(updatedJob.planId).toBeDefined();

    const plan = inMemoryJobs.get(`plan:${updatedJob.planId}`);
    expect(plan).toBeDefined();
    expect(plan.days.length).toBe(3);
    expect(Object.keys(plan.places).length).toBeGreaterThanOrEqual(3);
    expect(plan.budget.stay).toBeGreaterThan(0);
    expect(plan.weather).toBeDefined();
    expect(Array.isArray(plan.packing)).toBe(true);
    expect(plan.packing.length).toBeGreaterThan(0);
  });

  it("completes gracefully even for unknown destinations via global seed fallback", async () => {
    const job = {
      _id: "test-pipeline-job-unknown",
      userId: null,
      request: {
        destination: "NonexistentCityXYZ",
        days: 2,
        budget: 10000,
        currency: "INR",
        pace: "relaxed",
        interests: ["culture"],
      },
      status: "queued",
      progress: 0,
      stage: "places",
    };

    inMemoryJobs.set(job._id, job);

    await executeJob(job);

    const updatedJob = inMemoryJobs.get(job._id);
    expect(updatedJob.status).toBe("done");
    const plan = inMemoryJobs.get(`plan:${updatedJob.planId}`);
    expect(plan).toBeDefined();
    expect(plan.days.length).toBe(2);
    expect(plan.degraded).toContain("places:seed-fallback");
  });
});
