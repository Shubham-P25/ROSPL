/**
 * RAG (Retrieval-Augmented Generation) Index & BM25 Search Engine for PackGo
 * Zero paid APIs, fast in-memory indexing, and zero external vector dependencies.
 */

const fs = require("fs");
const path = require("path");

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
  "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your"
]);

function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

class BM25Index {
  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.chunks = [];
    this.docFreqs = {}; // term -> count of docs containing term
    this.avgDocLength = 0;
  }

  addChunk(chunk) {
    const tokens = tokenize(`${chunk.title} ${chunk.title} ${chunk.text}`);
    const tokenCounts = {};
    for (const t of tokens) {
      tokenCounts[t] = (tokenCounts[t] || 0) + 1;
    }

    this.chunks.push({
      ...chunk,
      tokens,
      tokenCounts,
      length: tokens.length,
    });
  }

  build() {
    const N = this.chunks.length;
    if (N === 0) return;

    this.docFreqs = {};
    let totalLength = 0;

    for (const doc of this.chunks) {
      totalLength += doc.length;
      const uniqueTerms = new Set(doc.tokens);
      for (const t of uniqueTerms) {
        this.docFreqs[t] = (this.docFreqs[t] || 0) + 1;
      }
    }

    this.avgDocLength = totalLength / N;
  }

  search(query, k = 4) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.chunks.length === 0) return [];

    const N = this.chunks.length;
    const scores = [];

    for (const doc of this.chunks) {
      let score = 0;
      const docLen = doc.length;

      for (const qTerm of queryTokens) {
        const df = this.docFreqs[qTerm] || 0;
        if (df === 0) continue;

        // Standard BM25 IDF with smoothing
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

        const tf = doc.tokenCounts[qTerm] || 0;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));

        score += idf * (numerator / denominator);

        // Substantial boost if term appears in title
        if (doc.title.toLowerCase().includes(qTerm)) {
          score += 1.5 * idf;
        }
      }

      if (score > 0) {
        scores.push({
          id: doc.id,
          source: doc.source,
          title: doc.title,
          text: doc.text,
          score,
        });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k);
  }
}

let globalIndex = null;

/**
 * Initializes and populates the BM25 knowledge index
 */
function initializeRAGIndex() {
  const index = new BM25Index();
  const rootDir = path.resolve(__dirname, "..");

  // 1. PackGo FAQ
  try {
    const faqPath = path.join(rootDir, "data", "rag", "packgo_faq.md");
    if (fs.existsSync(faqPath)) {
      const raw = fs.readFileSync(faqPath, "utf8");
      const sections = raw.split(/^##\s+/m);
      sections.forEach((sec, idx) => {
        if (!sec.trim()) return;
        const lines = sec.trim().split("\n");
        const title = lines[0].trim();
        const text = lines.slice(1).join("\n").trim();
        if (title && text) {
          index.addChunk({
            id: `faq-${idx}`,
            source: "PackGo Guide & FAQ",
            title,
            text,
          });
        }
      });
    }
  } catch (_e) {}

  // 2. Transport Notes
  try {
    const transportPath = path.join(rootDir, "data", "rag", "transport_notes.json");
    if (fs.existsSync(transportPath)) {
      const notes = JSON.parse(fs.readFileSync(transportPath, "utf8"));
      notes.forEach((item, idx) => {
        const text = [
          `Destination: ${item.destination}`,
          `Airport: ${item.airport}`,
          `Railway: ${item.railway}`,
          `Local Transit: ${item.localTransit}`,
          `Intercity Bus: ${item.intercityBus}`,
          `Important Note: ${item.notes}`,
        ].join("\n");

        index.addChunk({
          id: `transport-${idx}`,
          source: "Transport & Transit Guide",
          title: `Getting to and around ${item.destination}`,
          text,
        });
      });
    }
  } catch (_e) {}

  // 3. Emergency Numbers
  try {
    const emFile = path.join(rootDir, "data", "emergencyNumbers.js");
    if (fs.existsSync(emFile)) {
      const em = require(emFile);
      const inData = em?.IN || em?.EMERGENCY_NUMBERS?.IN;
      if (inData) {
        index.addChunk({
          id: "emergency-india",
          source: "National Emergency Directory",
          title: "India Emergency Numbers & Helplines",
          text: `National Emergency: ${inData.general || "112"}, Police: ${inData.police || "100"}, Ambulance: ${inData.ambulance || "102"}, Fire: ${inData.fire || "101"}, Women Helpline: ${inData.womenHelpline || "1091"}, Tourist Helpline: ${inData.touristHelpline || "1363"}, Railway Helpline: ${inData.railwayHelpline || "139"}, Highway Helpline: ${inData.highwayHelpline || "1033"}.`,
        });
      }
    }
  } catch (_e) {}

  // 4. India Destinations Reference Data
  try {
    const destPath = path.join(rootDir, "data", "india_destinations.json");
    if (fs.existsSync(destPath)) {
      const rawDest = JSON.parse(fs.readFileSync(destPath, "utf8"));
      const list = Array.isArray(rawDest) ? rawDest : (rawDest.destinations || []);
      list.forEach((d, idx) => {
        const text = [
          `Destination: ${d.name || d.city}`,
          d.state ? `State: ${d.state}` : "",
          d.description || d.overview ? `Overview: ${d.description || d.overview}` : "",
          d.bestTimeToVisit || d.bestTime ? `Best Time to Visit: ${d.bestTimeToVisit || d.bestTime}` : "",
          d.popularPlaces || d.topAttractions ? `Key Highlights: ${Array.isArray(d.popularPlaces || d.topAttractions) ? (d.popularPlaces || d.topAttractions).join(", ") : d.popularPlaces}` : "",
        ].filter(Boolean).join("\n");

        index.addChunk({
          id: `dest-${idx}`,
          source: "India Destinations Directory",
          title: `${d.name || d.city} Destination Overview`,
          text,
        });
      });
    }
  } catch (_e) {}

  // 5. Curated Seed Packs
  try {
    const seedDir = path.join(rootDir, "seed", "destinations");
    if (fs.existsSync(seedDir)) {
      const files = fs.readdirSync(seedDir).filter((f) => f.endsWith(".json"));
      files.forEach((f, fIdx) => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(seedDir, f), "utf8"));
          const destName = content.destination || path.basename(f, ".json");
          const placesText = (content.places || [])
            .map((p) => `- ${p.name} (${p.category || "Sight"}): ${p.description || ""} Est: ₹${p.estCost || 0}`)
            .join("\n");

          index.addChunk({
            id: `seed-${fIdx}`,
            source: `Curated Pack for ${destName}`,
            title: `Curated Places and Itinerary Highlights for ${destName}`,
            text: `Top verified landmarks in ${destName}:\n${placesText}`,
          });
        } catch (_err) {}
      });
    }
  } catch (_e) {}

  index.build();
  globalIndex = index;
  return globalIndex;
}

/**
 * Retrieve top K chunks relevant to query
 * @param {string} query
 * @param {number} [k=4]
 * @returns {Array<{id: string, source: string, title: string, text: string, score: number}>}
 */
function retrieve(query, k = 4) {
  if (!globalIndex) {
    initializeRAGIndex();
  }
  return globalIndex.search(query, k);
}

module.exports = {
  initializeRAGIndex,
  retrieve,
  tokenize,
};

