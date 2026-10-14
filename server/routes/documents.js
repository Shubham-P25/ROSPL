const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} = require("../controllers/documentController");

router.get("/", auth, getDocuments);
router.post("/", auth, createDocument);
router.put("/:id", auth, updateDocument);
router.delete("/:id", auth, deleteDocument);

module.exports = router;
