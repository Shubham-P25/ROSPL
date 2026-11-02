const { z } = require("zod");

const CATEGORIES = [
  "culture",
  "nature",
  "food",
  "shopping",
  "adventure",
  "nightlife",
  "religious",
  "other",
];

const PlaceSchema = z.object({
  id: z.string().min(1), // stable: `${source}:${sourceId}`
  name: z.string().min(1).max(200),
  category: z.enum(CATEGORIES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rating: z.number().min(0).max(5).optional(), // normalized 0..5
  popularity: z.number().min(0).max(1).optional(), // normalized 0..1
  rate: z.number().optional(), // OpenTripMap rate 1..3
  wikidata: z.string().optional(),
  visitMinutes: z.number().int().min(15).max(480).default(90),
  estCost: z.number().min(0).optional(), // in the trip currency
  description: z.string().max(600).optional(),
  photoUrl: z.string().url().optional(),
  photoCredit: z.string().max(300).optional(), // REQUIRED when photoUrl comes from Wikimedia
  photos: z.array(z.any()).optional(),
  vlogUrl: z.string().optional(),
  mapUrl: z.string().optional(),
  address: z.string().optional(),
  isFamousSpot: z.boolean().optional(),
  source: z.string(), // 'opentripmap' | 'seed' | ...
  sourceUrl: z.string().url().optional(),
});

module.exports = {
  CATEGORIES,
  PlaceSchema,
};
