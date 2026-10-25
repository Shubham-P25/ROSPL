const Document = require("../models/Document");

const WARNING_WINDOW_DAYS = 180; // 6 months — common visa-rejection threshold

function withExpiryStatus(doc) {
  // Normalize to UTC midnight to prevent timezone boundary drift
  const now = new Date();
  const utcNow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const expiry = new Date(doc.expiryDate);
  const utcExpiry = Date.UTC(
    expiry.getUTCFullYear(),
    expiry.getUTCMonth(),
    expiry.getUTCDate(),
  );

  const daysUntilExpiry = Math.floor(
    (utcExpiry - utcNow) / (1000 * 60 * 60 * 24),
  );

  let status = "ok";
  if (daysUntilExpiry < 0) status = "expired";
  else if (daysUntilExpiry <= WARNING_WINDOW_DAYS) status = "expiring_soon";

  return { ...doc.toObject(), daysUntilExpiry, status };
}

// @route   GET api/documents
// @desc    List the current user's documents, optionally filtered by trip
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    const { tripId } = req.query;
    const filter = { user: req.user.id };
    if (tripId) filter.trip = tripId;

    const documents = await Document.find(filter).sort({ expiryDate: 1 });
    res.json({
      success: true,
      documents: documents.map(withExpiryStatus),
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST api/documents
// @desc    Add a document
// @access  Private
exports.createDocument = async (req, res, next) => {
  try {
    const { tripId, type, label, issuingCountry, expiryDate } = req.body;

    if (!type || !label || !expiryDate) {
      return res
        .status(400)
        .json({ msg: "type, label, and expiryDate are required" });
    }

    const validTypes = ["passport", "visa", "insurance", "other"];
    if (!validTypes.includes(type)) {
      return res
        .status(400)
        .json({ msg: `type must be one of: ${validTypes.join(", ")}` });
    }

    if (isNaN(new Date(expiryDate).getTime())) {
      return res.status(400).json({ msg: "expiryDate is not a valid date" });
    }

    const doc = await Document.create({
      user: req.user.id,
      trip: tripId || null,
      type,
      label,
      issuingCountry: issuingCountry || null,
      expiryDate,
    });

    res.status(201).json({ success: true, document: withExpiryStatus(doc) });
  } catch (err) {
    next(err);
  }
};

// @route   PUT api/documents/:id
// @desc    Update a document
// @access  Private
exports.updateDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!doc) return res.status(404).json({ msg: "Document not found" });

    const { label, issuingCountry, expiryDate, type } = req.body;

    if (type) {
      const validTypes = ["passport", "visa", "insurance", "other"];
      if (!validTypes.includes(type)) {
        return res
          .status(400)
          .json({ msg: `type must be one of: ${validTypes.join(", ")}` });
      }
      doc.type = type;
    }
    if (label !== undefined) doc.label = label;
    if (issuingCountry !== undefined) doc.issuingCountry = issuingCountry;
    if (expiryDate !== undefined) {
      if (isNaN(new Date(expiryDate).getTime())) {
        return res.status(400).json({ msg: "expiryDate is not a valid date" });
      }
      doc.expiryDate = expiryDate;
    }

    await doc.save();
    res.json({ success: true, document: withExpiryStatus(doc) });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE api/documents/:id
// @desc    Delete a document
// @access  Private
exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!doc) return res.status(404).json({ msg: "Document not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
