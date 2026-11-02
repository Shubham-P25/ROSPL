const PackingList = require("../models/PackingList");
const Trip = require("../models/Trip");
const { recommendPacking } = require("../planner/packingRules");

// Preset templates
const TEMPLATES = {
  beach: [
    { name: "Sunscreen", category: "Toiletries" },
    { name: "Swimsuit", category: "Clothing" },
    { name: "Sunglasses", category: "Other" },
    { name: "Beach towel", category: "Other" },
    { name: "Flip flops", category: "Clothing" },
    { name: "Hat / cap", category: "Clothing" },
    { name: "Waterproof phone case", category: "Electronics" },
    { name: "Insect repellent", category: "Toiletries" },
  ],
  business: [
    { name: "Formal shirts", category: "Clothing" },
    { name: "Dress pants / skirts", category: "Clothing" },
    { name: "Laptop & charger", category: "Electronics" },
    { name: "Business cards", category: "Documents" },
    { name: "Passport / ID", category: "Documents" },
    { name: "Power bank", category: "Electronics" },
    { name: "Notebook & pen", category: "Other" },
    { name: "Toiletry bag", category: "Toiletries" },
  ],
  camping: [
    { name: "Tent", category: "Other" },
    { name: "Sleeping bag", category: "Other" },
    { name: "Flashlight / headlamp", category: "Electronics" },
    { name: "First aid kit", category: "Medicine" },
    { name: "Water bottle", category: "Other" },
    { name: "Trail shoes", category: "Clothing" },
    { name: "Insect repellent", category: "Toiletries" },
    { name: "Rain jacket", category: "Clothing" },
  ],
};

// GET /api/packing/:tripId
exports.getPackingList = async (req, res) => {
  try {
    let list = await PackingList.findOne({
      trip: req.params.tripId,
      user: req.user.id,
    });
    if (!list) {
      list = await PackingList.create({
        trip: req.params.tripId,
        user: req.user.id,
        items: [],
      });
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/items — add a single item
exports.addItem = async (req, res) => {
  try {
    const { name, category, reason } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const list = await PackingList.findOne({
      trip: req.params.tripId,
      user: req.user.id,
    });

    if (list) {
      const duplicate = list.items.find(
        (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );

      if (duplicate) {
        return res.status(400).json({
          message: "Item already exists in the packing list",
        });
      }
    }

    const updatedList = await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      {
        $push: {
          items: {
            name: name.trim(),
            category: category || "Other",
            reason: reason ? String(reason).trim() : "",
            source: "manual",
            packed: false,
          },
        },
      },
      { new: true, upsert: true },
    );

    res.json(updatedList);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PATCH /api/packing/:tripId/items/:itemId — toggle packed
exports.toggleItem = async (req, res) => {
  try {
    const list = await PackingList.findOne({
      trip: req.params.tripId,
      user: req.user.id,
    });
    if (!list)
      return res.status(404).json({ message: "Packing list not found" });

    const item = list.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.packed = !item.packed;
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/packing/:tripId/items/:itemId
exports.deleteItem = async (req, res) => {
  try {
    const list = await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      { $pull: { items: { _id: req.params.itemId } } },
      { new: true },
    );
    if (!list)
      return res.status(404).json({ message: "Packing list not found" });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/template — apply a preset template
exports.applyTemplate = async (req, res) => {
  try {
    const { template } = req.body;
    const items = TEMPLATES[template];
    if (!items)
      return res.status(400).json({ message: "Invalid template name" });

    let list = await PackingList.findOne({
      trip: req.params.tripId,
      user: req.user.id,
    });

    if (!list) {
      list = await PackingList.create({
        trip: req.params.tripId,
        user: req.user.id,
        items: [],
      });
    }

    const existingNames = new Set(
      list.items.map((item) => item.name.trim().toLowerCase()),
    );

    const templateItems = items
      .filter((item) => !existingNames.has(item.name.trim().toLowerCase()))
      .map((item) => ({
        ...item,
        source: "template",
        packed: false,
      }));

    list.items.push(...templateItems);
    await list.save();

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/recommend — Smart 1-click packing recommendations
exports.recommendItems = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    let days = 3;
    if (trip.startDate && trip.endDate) {
      const ms = new Date(trip.endDate) - new Date(trip.startDate);
      days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
    }

    const recs = recommendPacking({
      destination: trip.destination,
      weather: trip.planData?.weather || null,
      days,
      people: trip.numberOfPeople || 1,
      interests: trip.interests || [],
      places: trip.planData?.places ? Object.values(trip.planData.places) : (trip.activities || []),
    });

    let list = await PackingList.findOne({
      trip: req.params.tripId,
      user: req.user.id,
    });

    if (!list) {
      list = await PackingList.create({
        trip: req.params.tripId,
        user: req.user.id,
        items: [],
      });
    }

    const existingNames = new Set(list.items.map((i) => i.name.trim().toLowerCase()));
    const toAdd = recs
      .filter((r) => !existingNames.has(r.name.trim().toLowerCase()))
      .map((r) => ({
        name: r.name,
        category: r.category,
        reason: r.reason,
        source: "recommended",
        packed: false,
      }));

    const startIndex = list.items.length;
    list.items.push(...toAdd);
    await list.save();

    const addedIds = list.items.slice(startIndex).map((i) => i._id.toString());

    return res.json({
      success: true,
      list,
      addedCount: addedIds.length,
      addedIds,
    });
  } catch (err) {
    console.error("Recommend packing error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/items/batch-delete — Undo added items
exports.batchDeleteItems = async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "itemIds array is required" });
    }

    const list = await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      { $pull: { items: { _id: { $in: itemIds } } } },
      { new: true },
    );

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/remove-recommended — Remove all recommended items
exports.removeRecommended = async (req, res) => {
  try {
    const list = await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      { $pull: { items: { source: "recommended" } } },
      { new: true },
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/packing/:tripId/reset-recommended — Reset & regenerate recommended items
exports.resetRecommended = async (req, res) => {
  try {
    // 1. Remove existing recommended
    await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      { $pull: { items: { source: "recommended" } } },
    );

    // 2. Run recommend logic
    return exports.recommendItems(req, res);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/packing/:tripId/items — clear all items
exports.clearAll = async (req, res) => {
  try {
    const list = await PackingList.findOneAndUpdate(
      { trip: req.params.tripId, user: req.user.id },
      { $set: { items: [] } },
      { new: true },
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
