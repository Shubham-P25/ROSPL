const EMERGENCY_NUMBERS = {
  IN: {
    country: "India",
    police: "100",
    ambulance: "102",
    fire: "101",
    general: "112",
    womenHelpline: "1091",
    touristHelpline: "1363",
    railwayHelpline: "139",
    highwayHelpline: "1033",
    keywords: [
      "india",
      "indian",
      "delhi",
      "mumbai",
      "goa",
      "bengaluru",
      "bangalore",
      "jaipur",
      "kerala",
      "agra",
      "rajasthan",
      "kolkata",
      "chennai",
      "hyderabad",
      "varanasi",
      "ladakh",
      "shimla",
      "manali",
      "rishikesh",
      "amritsar",
      "pune",
      "ahmedabad",
      "udaipur",
      "kashmir",
      "srinagar",
      "munnar",
      "ooty",
      "darjeeling",
      "hampi",
      "mysore",
    ],
  },
  US: {
    country: "United States",
    police: "911",
    ambulance: "911",
    fire: "911",
    general: "911",
    keywords: [
      "usa",
      "united states",
      "america",
      "us",
      "new york",
      "california",
      "texas",
      "florida",
      "los angeles",
      "chicago",
      "san francisco",
      "miami",
      "las vegas",
      "hawaii",
      "washington",
    ],
  },
  GB: {
    country: "United Kingdom",
    police: "999",
    ambulance: "999",
    fire: "999",
    general: "999",
    nonEmergencyPolice: "101",
    keywords: [
      "uk",
      "united kingdom",
      "britain",
      "england",
      "scotland",
      "wales",
      "london",
      "manchester",
      "edinburgh",
      "birmingham",
      "glasgow",
    ],
  },
  AU: {
    country: "Australia",
    police: "000",
    ambulance: "000",
    fire: "000",
    general: "000",
    keywords: [
      "australia",
      "aussie",
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "gold coast",
      "cairns",
    ],
  },
  NZ: {
    country: "New Zealand",
    police: "111",
    ambulance: "111",
    fire: "111",
    general: "111",
    keywords: [
      "new zealand",
      "nz",
      "auckland",
      "wellington",
      "queenstown",
      "christchurch",
    ],
  },
  ZA: {
    country: "South Africa",
    police: "10111",
    ambulance: "10177",
    fire: "10177",
    general: "112",
    keywords: [
      "south africa",
      "za",
      "rsa",
      "cape town",
      "johannesburg",
      "durban",
      "pretoria",
    ],
  },
  SG: {
    country: "Singapore",
    police: "999",
    ambulance: "995",
    fire: "995",
    general: "995",
    keywords: ["singapore", "sg"],
  },
  AE: {
    country: "United Arab Emirates",
    police: "999",
    ambulance: "998",
    fire: "997",
    general: "112",
    touristPolice: "901",
    keywords: ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah"],
  },
  CA: {
    country: "Canada",
    police: "911",
    ambulance: "911",
    fire: "911",
    general: "911",
    keywords: [
      "canada",
      "canadian",
      "toronto",
      "vancouver",
      "montreal",
      "ottawa",
      "calgary",
    ],
  },
  FR: {
    country: "France",
    police: "17",
    ambulance: "15",
    fire: "18",
    general: "112",
    euGeneral: "112",
    keywords: [
      "france",
      "french",
      "paris",
      "nice",
      "lyon",
      "marseille",
      "cannes",
      "bordeaux",
    ],
  },
  IT: {
    country: "Italy",
    police: "113",
    ambulance: "118",
    fire: "115",
    general: "112",
    euGeneral: "112",
    keywords: [
      "italy",
      "italian",
      "rome",
      "milan",
      "florence",
      "venice",
      "naples",
    ],
  },
  DE: {
    country: "Germany",
    police: "110",
    ambulance: "112",
    fire: "112",
    general: "112",
    euGeneral: "112",
    keywords: [
      "germany",
      "german",
      "berlin",
      "munich",
      "frankfurt",
      "hamburg",
      "cologne",
    ],
  },
  JP: {
    country: "Japan",
    police: "110",
    ambulance: "119",
    fire: "119",
    general: "110",
    keywords: ["japan", "japanese", "tokyo", "kyoto", "osaka", "hokkaido"],
  },
  TH: {
    country: "Thailand",
    police: "191",
    ambulance: "1669",
    fire: "199",
    general: "191",
    touristPolice: "1155",
    keywords: [
      "thailand",
      "thai",
      "bangkok",
      "phuket",
      "chiang mai",
      "pattaya",
      "krabi",
      "koh samui",
    ],
  },
};

const GENERIC_FALLBACK = {
  country: "International Standard",
  general: "112",
  police: "112",
  ambulance: "112",
  fire: "112",
  note: "112 works on GSM mobile networks worldwide, even without a SIM card or unlocked screen.",
};

function resolveCountryCodeFromDestination(destination = "") {
  if (!destination || typeof destination !== "string") return null;
  const normalized = destination.toLowerCase().trim();

  // Try matching words in destination against country keywords
  for (const [code, entry] of Object.entries(EMERGENCY_NUMBERS)) {
    const isMatch = entry.keywords.some((kw) => {
      const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, "i");
      return regex.test(normalized);
    });

    if (isMatch) return code;
  }

  // Direct 2-letter country code match
  if (destination.trim().length === 2) {
    const code = destination.trim().toUpperCase();
    if (EMERGENCY_NUMBERS[code]) return code;
  }

  return null;
}

module.exports = {
  EMERGENCY_NUMBERS,
  GENERIC_FALLBACK,
  resolveCountryCodeFromDestination,
  getAllEmergencyNumbers: () => EMERGENCY_NUMBERS,
  getEmergencyByCode: (code) => EMERGENCY_NUMBERS[code?.toUpperCase()] || null,
  matchEmergencyCountry: (dest) => {
    const code = resolveCountryCodeFromDestination(dest);
    return code
      ? { code, ...EMERGENCY_NUMBERS[code] }
      : { code: "DEFAULT", ...GENERIC_FALLBACK };
  },
};
