const { z } = require("zod");
const { CATEGORIES } = require("./place");

const PlanRequestSchema = z.object({
  destination: z.string().min(2).max(100),
  days: z.number().int().min(1).max(14),
  budget: z.number().positive().max(100000000),
  currency: z.string().length(3).default("INR"),
  travellers: z.number().int().min(1).max(20).default(1),
  interests: z.array(z.enum(CATEGORIES)).min(1).max(6),
  pace: z.enum(["relaxed", "normal", "packed"]).default("normal"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .optional(),
});

module.exports = {
  PlanRequestSchema,
};
