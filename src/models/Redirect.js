const mongoose = require("mongoose");

/**
 * Manual redirects for old paths (for example an old collection URL). Renamed
 * product and category slugs are handled automatically through previousSlugs.
 */
const redirectSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, unique: true, trim: true, lowercase: true },
    to: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: [301, 302], default: 301 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Redirect = mongoose.model("Redirect", redirectSchema);

module.exports = { Redirect };
