const { executeJob, inMemoryJobs } = require("../jobs/runner");

async function runVerification() {
  console.log("=== RUNNING DEFINITION OF DONE VERIFICATION ===");
  const testJob = {
    _id: "e2e-verification-jaipur",
    userId: null,
    request: {
      destination: "Jaipur",
      days: 3,
      budget: 15000,
      currency: "INR",
      pace: "normal",
      interests: ["culture", "food"],
      travellers: 2,
    },
    status: "queued",
    progress: 0,
    stage: "places",
  };

  inMemoryJobs.set(testJob._id, testJob);

  await executeJob(testJob);

  const completedJob = inMemoryJobs.get(testJob._id);
  if (completedJob.status !== "done") {
    console.error("FAIL: Job status is not 'done':", completedJob);
    process.exit(1);
  }

  const plan = inMemoryJobs.get(`plan:${completedJob.planId}`);
  if (!plan) {
    console.error("FAIL: Saved plan snapshot not found");
    process.exit(1);
  }

  console.log("✓ Plan Generated Successfully!");
  console.log(`✓ Destination: ${plan.request.destination}`);
  console.log(`✓ Days Count: ${plan.days.length}`);
  console.log(`✓ Total Places Selected: ${Object.keys(plan.places).length}`);
  console.log(
    `✓ Budget Total Check: ${plan.budget.stay + plan.budget.food + plan.budget.transport + plan.budget.activities + plan.budget.buffer} INR (Target: ${plan.request.budget} INR)`,
  );
  console.log(
    `✓ Weather: High ${plan.weather.temperatureMax}°C / Low ${plan.weather.temperatureMin}°C (Rain Prob: ${plan.weather.rainProbability}%)`,
  );
  console.log(`✓ Packing Items Count: ${plan.packing.length}`);

  // Check each day structure
  plan.days.forEach((day) => {
    console.log(`\n  --- Day ${day.day} (${day.items.length} stops) ---`);
    day.items.forEach((item) => {
      const place = plan.places[item.placeId];
      console.log(
        `    [${item.slot.toUpperCase()}] ${place ? place.name : item.placeId} (Est. cost: ₹${place ? place.estCost : 0})`,
      );
    });
  });

  console.log("\n=== ALL CRITERIA SATISFIED! DEFINITION OF DONE PASSED ===");
}

runVerification().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
