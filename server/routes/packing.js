const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getPackingList,
  addItem,
  toggleItem,
  deleteItem,
  applyTemplate,
  clearAll,
  recommendItems,
  batchDeleteItems,
  removeRecommended,
  resetRecommended,
} = require("../controllers/packingController");

router.get("/:tripId", auth, getPackingList);
router.post("/:tripId/items", auth, addItem);
router.patch("/:tripId/items/:itemId", auth, toggleItem);
router.delete("/:tripId/items/:itemId", auth, deleteItem);
router.post("/:tripId/template", auth, applyTemplate);
router.delete("/:tripId/items", auth, clearAll);

// Smart recommendation routes
router.post("/:tripId/recommend", auth, recommendItems);
router.post("/:tripId/items/batch-delete", auth, batchDeleteItems);
router.post("/:tripId/remove-recommended", auth, removeRecommended);
router.post("/:tripId/reset-recommended", auth, resetRecommended);

module.exports = router;
