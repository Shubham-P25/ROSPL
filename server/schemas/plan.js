const { z } = require("zod");
const { PlaceSchema } = require("./place");
const { PlanRequestSchema } = require("./request");

const PlanItemSchema = z.object({
  placeId: z.string(),
  slot: z.enum(["morning", "afternoon", "evening"]),
  travelMinutesFromPrev: z.number().int().min(0),
});

const PlanDaySchema = z.object({
  day: z.number().int(),
  items: z.array(PlanItemSchema),
  estCost: z.number().min(0),
});

const PlanSchema = z.object({
  request: PlanRequestSchema,
  days: z.array(PlanDaySchema),
  places: z.record(z.string(), PlaceSchema), // map placeId -> Place (snapshot)
  budget: z.object({
    stay: z.number(),
    food: z.number(),
    transport: z.number(),
    activities: z.number(),
    buffer: z.number(),
  }),
  weather: z.any().optional(),
  packing: z
    .array(z.object({ item: z.string(), reason: z.string() }))
    .default([]),
  warnings: z.array(z.string()).default([]),
  degraded: z.array(z.string()).default([]), // e.g. ['photos','weather']
  generatedAt: z.string(),
  schemaVersion: z.literal(1),
});

module.exports = {
  PlanItemSchema,
  PlanDaySchema,
  PlanSchema,
};
