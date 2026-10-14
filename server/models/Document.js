const mongoose = require("mongoose");

// PRIVACY NOTE: deliberately does NOT store full passport/visa/ID numbers.
// A document number field was considered and left out on purpose — if this
// database were ever breached, full government ID numbers would be a much
// more serious leak than an expiry date and a label. If a number field is
// added later, it should be encrypted at rest (e.g. via app-level AES),
// not stored in plaintext like the rest of this schema.
const DocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    type: {
      type: String,
      enum: ["passport", "visa", "insurance", "other"],
      required: true,
    },
    label: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
      // e.g. "Indian Passport", "Schengen Visa", "World Nomads Insurance"
    },
    issuingCountry: {
      type: String,
      trim: true,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

DocumentSchema.index({ user: 1, expiryDate: 1 });
DocumentSchema.index({ trip: 1, user: 1 });

module.exports = mongoose.model("Document", DocumentSchema);
